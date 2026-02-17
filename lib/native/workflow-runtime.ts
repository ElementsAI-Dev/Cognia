/**
 * Native workflow runtime bridge client.
 * Wraps Tauri commands exposed by src-tauri workflow runtime.
 */

import { listen, type UnlistenFn } from '@tauri-apps/api/event';

import { invokeWithTrace } from '@/lib/native/invoke-with-trace';
import { isTauri } from '@/lib/utils';
import type { WorkflowDefinition } from '@/types/workflow';
import type { EditorExecutionStatus, NodeExecutionStatus } from '@/types/workflow/workflow-editor';

export type WorkflowRuntimeLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface WorkflowRuntimeRunOptions {
  triggerId?: string;
  isReplay?: boolean;
  timeoutMs?: number;
  requestId?: string;
  runtimeConfig?: {
    provider?: string;
    model?: string;
    timeoutMs?: number;
    retry?: number;
    toolBridge?: 'native' | 'ipc' | 'auto';
    [key: string]: unknown;
  };
}

export interface WorkflowRuntimeRunRequest {
  definition: WorkflowDefinition;
  input: Record<string, unknown>;
  options?: WorkflowRuntimeRunOptions;
}

export interface WorkflowRuntimeStepState {
  stepId: string;
  status: NodeExecutionStatus | EditorExecutionStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  retryCount?: number;
}

export interface WorkflowRuntimeLogEntry {
  eventId?: string;
  level?: WorkflowRuntimeLogLevel;
  code?: string;
  requestId?: string;
  executionId?: string;
  workflowId?: string;
  stepId?: string;
  traceId?: string;
  timestamp: string;
  message?: string;
  error?: string;
  data?: Record<string, unknown> | unknown[] | string | number | boolean | null;
}

export interface WorkflowRuntimeRunResult {
  executionId: string;
  status: EditorExecutionStatus;
  output?: Record<string, unknown>;
  stepStates: WorkflowRuntimeStepState[];
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface WorkflowRuntimeExecutionRecord {
  executionId: string;
  workflowId: string;
  status: EditorExecutionStatus;
  requestId?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  stepStates?: WorkflowRuntimeStepState[];
  logs?: WorkflowRuntimeLogEntry[];
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export type WorkflowRuntimeNativeEventType =
  | 'execution_started'
  | 'execution_progress'
  | 'step_started'
  | 'step_completed'
  | 'step_failed'
  | 'execution_log'
  | 'execution_completed'
  | 'execution_failed'
  | 'execution_cancelled';

export interface WorkflowRuntimeNativeEvent {
  type: WorkflowRuntimeNativeEventType;
  eventId?: string;
  level?: WorkflowRuntimeLogLevel;
  code?: string;
  traceId?: string;
  requestId?: string;
  executionId: string;
  workflowId: string;
  timestamp: string;
  progress?: number;
  stepId?: string;
  message?: string;
  error?: string;
  data?: Record<string, unknown> | unknown[] | string | number | boolean | null;
}

function assertTauriRuntime(): void {
  if (!isTauri()) {
    throw new Error('Workflow runtime commands require Tauri environment');
  }
}

function readString(raw: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function readNumber(raw: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

function normalizeLogLevel(level?: string): WorkflowRuntimeLogLevel | undefined {
  if (!level) {
    return undefined;
  }
  switch (level.toLowerCase()) {
    case 'trace':
      return 'trace';
    case 'debug':
      return 'debug';
    case 'info':
      return 'info';
    case 'warn':
    case 'warning':
      return 'warn';
    case 'error':
      return 'error';
    case 'fatal':
      return 'fatal';
    default:
      return undefined;
  }
}

function normalizeStepState(raw: Record<string, unknown>): WorkflowRuntimeStepState {
  return {
    stepId: readString(raw, ['stepId', 'step_id']) || '',
    status: ((raw.status as string) || 'failed') as WorkflowRuntimeStepState['status'],
    input: (raw.input as Record<string, unknown>) || undefined,
    output: (raw.output as Record<string, unknown>) || undefined,
    error: readString(raw, ['error']),
    startedAt: readString(raw, ['startedAt', 'started_at']),
    completedAt: readString(raw, ['completedAt', 'completed_at']),
    retryCount: readNumber(raw, ['retryCount', 'retry_count']),
  };
}

function normalizeLogEntry(raw: Record<string, unknown>): WorkflowRuntimeLogEntry {
  return {
    eventId: readString(raw, ['eventId', 'event_id', 'id']),
    level: normalizeLogLevel(readString(raw, ['level', 'logLevel', 'log_level'])),
    code: readString(raw, ['code']),
    requestId: readString(raw, ['requestId', 'request_id']),
    executionId: readString(raw, ['executionId', 'execution_id']),
    workflowId: readString(raw, ['workflowId', 'workflow_id']),
    stepId: readString(raw, ['stepId', 'step_id']),
    traceId: readString(raw, ['traceId', 'trace_id']),
    timestamp:
      readString(raw, ['timestamp', 'time', 'createdAt', 'created_at']) || new Date().toISOString(),
    message: readString(raw, ['message']),
    error: readString(raw, ['error']),
    data:
      raw.data !== undefined
        ? (raw.data as WorkflowRuntimeLogEntry['data'])
        : undefined,
  };
}

function normalizeRunResult(raw: Record<string, unknown>): WorkflowRuntimeRunResult {
  const rawStepStates = (raw.stepStates as unknown[]) || (raw.step_states as unknown[]) || [];
  return {
    executionId: (readString(raw, ['executionId', 'execution_id']) || '').trim(),
    status: ((raw.status as string) || 'failed') as EditorExecutionStatus,
    output: (raw.output as Record<string, unknown>) || undefined,
    stepStates: rawStepStates
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => normalizeStepState(item)),
    error: readString(raw, ['error']),
    startedAt: readString(raw, ['startedAt', 'started_at']),
    completedAt: readString(raw, ['completedAt', 'completed_at']),
  };
}

function normalizeExecutionRecord(raw: Record<string, unknown>): WorkflowRuntimeExecutionRecord {
  const rawStepStates = (raw.stepStates as unknown[]) || (raw.step_states as unknown[]) || [];
  const rawLogs = (raw.logs as unknown[]) || (raw.runtimeLogs as unknown[]) || [];

  return {
    executionId: (readString(raw, ['executionId', 'execution_id']) || '').trim(),
    workflowId: (readString(raw, ['workflowId', 'workflow_id']) || '').trim(),
    status: ((raw.status as string) || 'failed') as EditorExecutionStatus,
    requestId: readString(raw, ['requestId', 'request_id']),
    input: (raw.input as Record<string, unknown>) || undefined,
    output: (raw.output as Record<string, unknown>) || undefined,
    stepStates: rawStepStates
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => normalizeStepState(item)),
    logs: rawLogs
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => normalizeLogEntry(item)),
    error: readString(raw, ['error']),
    startedAt: readString(raw, ['startedAt', 'started_at']),
    completedAt: readString(raw, ['completedAt', 'completed_at']),
  };
}

function normalizeNativeEvent(raw: Record<string, unknown>): WorkflowRuntimeNativeEvent {
  const eventType =
    readString(raw, ['type', 'eventType', 'event_type']) || 'execution_log';
  return {
    type: eventType as WorkflowRuntimeNativeEventType,
    eventId: readString(raw, ['eventId', 'event_id', 'id']),
    level: normalizeLogLevel(readString(raw, ['level', 'logLevel', 'log_level'])),
    code: readString(raw, ['code']),
    traceId: readString(raw, ['traceId', 'trace_id']),
    requestId: readString(raw, ['requestId', 'request_id']),
    executionId: (readString(raw, ['executionId', 'execution_id']) || '').trim(),
    workflowId: (readString(raw, ['workflowId', 'workflow_id']) || '').trim(),
    timestamp:
      readString(raw, ['timestamp', 'time', 'createdAt', 'created_at']) || new Date().toISOString(),
    progress: readNumber(raw, ['progress']),
    stepId: readString(raw, ['stepId', 'step_id']),
    message: readString(raw, ['message']),
    error: readString(raw, ['error']),
    data:
      raw.data !== undefined
        ? (raw.data as WorkflowRuntimeNativeEvent['data'])
        : undefined,
  };
}

export async function workflowRunDefinition(
  request: WorkflowRuntimeRunRequest
): Promise<WorkflowRuntimeRunResult> {
  assertTauriRuntime();
  const raw = await invokeWithTrace<Record<string, unknown>>('workflow_run_definition', { request });
  return normalizeRunResult(raw);
}

export async function workflowCancelExecution(executionId: string): Promise<boolean> {
  assertTauriRuntime();
  return invokeWithTrace<boolean>('workflow_cancel_execution', { executionId });
}

export async function workflowPauseExecution(executionId: string): Promise<boolean> {
  assertTauriRuntime();
  return invokeWithTrace<boolean>('workflow_pause_execution', { executionId });
}

export async function workflowResumeExecution(executionId: string): Promise<boolean> {
  assertTauriRuntime();
  return invokeWithTrace<boolean>('workflow_resume_execution', { executionId });
}

export async function workflowGetExecution(
  executionId: string
): Promise<WorkflowRuntimeExecutionRecord | null> {
  assertTauriRuntime();
  const raw = await invokeWithTrace<Record<string, unknown> | null>('workflow_get_execution', {
    executionId,
  });
  if (!raw) {
    return null;
  }
  return normalizeExecutionRecord(raw);
}

export async function workflowListExecutions(
  workflowId?: string,
  limit?: number
): Promise<WorkflowRuntimeExecutionRecord[]> {
  assertTauriRuntime();
  const raw = await invokeWithTrace<Record<string, unknown>[]>('workflow_list_executions', {
    workflowId,
    limit,
  });
  return raw.map((item) => normalizeExecutionRecord(item));
}

export async function onWorkflowRuntimeEvent(
  callback: (event: WorkflowRuntimeNativeEvent) => void
): Promise<UnlistenFn> {
  assertTauriRuntime();
  return listen<Record<string, unknown>>('workflow-runtime://event', (event) => {
    if (!event.payload || typeof event.payload !== 'object') {
      return;
    }
    callback(normalizeNativeEvent(event.payload as Record<string, unknown>));
  });
}

export const workflowRuntime = {
  runDefinition: workflowRunDefinition,
  cancelExecution: workflowCancelExecution,
  pauseExecution: workflowPauseExecution,
  resumeExecution: workflowResumeExecution,
  getExecution: workflowGetExecution,
  listExecutions: workflowListExecutions,
  onEvent: onWorkflowRuntimeEvent,
};

export default workflowRuntime;

