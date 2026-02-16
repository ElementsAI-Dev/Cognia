/**
 * Process Management Service - Interface to Tauri backend for local process operations
 *
 * Provides functions for:
 * - Listing running processes
 * - Getting process details
 * - Starting new processes (with restrictions)
 * - Terminating processes
 *
 * Security: All operations require explicit user approval and have allowlist restrictions.
 * Only available in Tauri desktop environment.
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './utils';

/** Process information */
export interface ProcessInfo {
  /** Process ID */
  pid: number;
  /** Process name */
  name: string;
  /** Executable path (if available) */
  exePath?: string;
  /** Command line arguments */
  cmdLine?: string[];
  /** Parent process ID */
  parentPid?: number;
  /** CPU usage percentage (0-100) */
  cpuPercent?: number;
  /** Memory usage in bytes */
  memoryBytes?: number;
  /** Process status */
  status: ProcessStatus;
  /** Start time (Unix timestamp) */
  startTime?: number;
  /** User/owner */
  user?: string;
  /** Working directory */
  cwd?: string;
}

/** Process status */
export type ProcessStatus = 'running' | 'sleeping' | 'stopped' | 'zombie' | 'unknown';

/** Process filter for listing */
export interface ProcessFilter {
  /** Filter by name (partial match, case-insensitive) */
  name?: string;
  /** Filter by PID */
  pid?: number;
  /** Filter by parent PID */
  parentPid?: number;
  /** Filter by user */
  user?: string;
  /** Minimum CPU usage */
  minCpu?: number;
  /** Minimum memory usage (bytes) */
  minMemory?: number;
  /** Maximum number of results */
  limit?: number;
  /** Sort by field */
  sortBy?: ProcessSortField;
  /** Sort descending */
  sortDesc?: boolean;
}

/** Sort field for process list */
export type ProcessSortField = 'pid' | 'name' | 'cpu' | 'memory' | 'startTime';

/** Request to start a new process */
export interface StartProcessRequest {
  /** Program path or name */
  program: string;
  /** Command line arguments */
  args?: string[];
  /** Working directory */
  cwd?: string;
  /** Environment variables (merged with current) */
  env?: Record<string, string>;
  /** Run in background (detached) */
  detached?: boolean;
  /** Timeout for process start (seconds) */
  timeoutSecs?: number;
  /** Capture stdout/stderr (for non-detached) */
  captureOutput?: boolean;
}

/** Result of starting a process */
export interface StartProcessResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Process ID (if started successfully) */
  pid?: number;
  /** Stdout output (if captured) */
  stdout?: string;
  /** Stderr output (if captured) */
  stderr?: string;
  /** Exit code (if process completed) */
  exitCode?: number;
  /** Error message */
  error?: string;
  /** Duration in milliseconds */
  durationMs?: number;
}

/** Request to terminate a process */
export interface TerminateProcessRequest {
  /** Process ID to terminate */
  pid: number;
  /** Force kill (SIGKILL on Unix, TerminateProcess on Windows) */
  force?: boolean;
  /** Timeout for graceful termination (seconds) */
  timeoutSecs?: number;
}

/** Result of terminating a process */
export interface TerminateProcessResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Exit code (if available) */
  exitCode?: number;
  /** Error message */
  error?: string;
}

/** Request to start multiple processes in parallel */
export interface StartProcessBatchRequest {
  /** Start requests to run */
  requests: StartProcessRequest[];
  /** Max number of requests to execute concurrently */
  maxConcurrency?: number;
}

/** Per-item result for start batch */
export interface StartProcessBatchItemResult {
  index: number;
  program: string;
  result: StartProcessResult;
}

/** Result of start batch */
export interface StartProcessBatchResult {
  total: number;
  successCount: number;
  failureCount: number;
  results: StartProcessBatchItemResult[];
}

/** Request to terminate multiple processes in parallel */
export interface TerminateProcessBatchRequest {
  /** Terminate requests to run */
  requests: TerminateProcessRequest[];
  /** Max number of requests to execute concurrently */
  maxConcurrency?: number;
}

/** Per-item result for terminate batch */
export interface TerminateProcessBatchItemResult {
  index: number;
  pid: number;
  result: TerminateProcessResult;
}

/** Result of terminate batch */
export interface TerminateProcessBatchResult {
  total: number;
  successCount: number;
  failureCount: number;
  results: TerminateProcessBatchItemResult[];
}

/** Async process operation type */
export type ProcessOperationType = 'startBatch' | 'terminateBatch';

/** Async process operation status */
export type ProcessOperationStatus = 'pending' | 'running' | 'completed' | 'failed';

/** Async operation result payload */
export type ProcessOperationResult =
  | {
      kind: 'startBatch';
      payload: StartProcessBatchResult;
    }
  | {
      kind: 'terminateBatch';
      payload: TerminateProcessBatchResult;
    };

/** Async operation record */
export interface ProcessOperation {
  operationId: string;
  operationType: ProcessOperationType;
  status: ProcessOperationStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  result?: ProcessOperationResult;
}

/** Process manager configuration */
export interface ProcessManagerConfig {
  /** Whether process management is enabled */
  enabled: boolean;
  /** Allowlist of programs that can be started (empty = all allowed) */
  allowedPrograms: string[];
  /** Denylist of programs that cannot be started */
  deniedPrograms: string[];
  /** Whether to allow terminating any process */
  allowTerminateAny: boolean;
  /** Only allow terminating processes started by this app */
  onlyTerminateOwn: boolean;
  /** Maximum concurrent processes to track */
  maxTrackedProcesses: number;
  /** Default timeout for operations */
  defaultTimeoutSecs: number;
}

interface BackendProcessInfo {
  pid: number;
  name: string;
  exePath?: string;
  exe_path?: string;
  cmdLine?: string[];
  cmd_line?: string[];
  parentPid?: number;
  parent_pid?: number;
  cpuPercent?: number;
  cpu_percent?: number;
  memoryBytes?: number;
  memory_bytes?: number;
  status: ProcessStatus;
  startTime?: number;
  start_time?: number;
  user?: string;
  cwd?: string;
}

interface BackendStartProcessResult {
  success: boolean;
  pid?: number;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  exit_code?: number;
  error?: string;
  durationMs?: number;
  duration_ms?: number;
}

interface BackendTerminateProcessResult {
  success: boolean;
  exitCode?: number;
  exit_code?: number;
  error?: string;
}

interface BackendStartProcessBatchRequest {
  requests: Record<string, unknown>[];
  maxConcurrency?: number;
  max_concurrency?: number;
}

interface BackendStartProcessBatchItemResult {
  index: number;
  program: string;
  result: BackendStartProcessResult;
}

interface BackendStartProcessBatchResult {
  total: number;
  successCount?: number;
  success_count?: number;
  failureCount?: number;
  failure_count?: number;
  results: BackendStartProcessBatchItemResult[];
}

interface BackendTerminateProcessBatchRequest {
  requests: Record<string, unknown>[];
  maxConcurrency?: number;
  max_concurrency?: number;
}

interface BackendTerminateProcessBatchItemResult {
  index: number;
  pid: number;
  result: BackendTerminateProcessResult;
}

interface BackendTerminateProcessBatchResult {
  total: number;
  successCount?: number;
  success_count?: number;
  failureCount?: number;
  failure_count?: number;
  results: BackendTerminateProcessBatchItemResult[];
}

type BackendProcessOperationKind =
  | 'startBatch'
  | 'terminateBatch'
  | 'StartBatch'
  | 'TerminateBatch'
  | 'start_batch'
  | 'terminate_batch';

interface BackendProcessOperationResult {
  kind?: BackendProcessOperationKind;
  payload?: BackendStartProcessBatchResult | BackendTerminateProcessBatchResult;
  startBatch?: BackendStartProcessBatchResult;
  terminateBatch?: BackendTerminateProcessBatchResult;
  StartBatch?: BackendStartProcessBatchResult;
  TerminateBatch?: BackendTerminateProcessBatchResult;
}

interface BackendProcessOperation {
  operationId?: string;
  operation_id?: string;
  operationType?: ProcessOperationType | 'start_batch' | 'terminate_batch';
  operation_type?: ProcessOperationType | 'start_batch' | 'terminate_batch';
  status: ProcessOperationStatus;
  createdAt?: number;
  created_at?: number;
  startedAt?: number;
  started_at?: number;
  completedAt?: number;
  completed_at?: number;
  error?: string;
  result?: BackendProcessOperationResult;
}

interface BackendProcessConfig {
  enabled?: boolean;
  allowedPrograms?: string[];
  allowed_programs?: string[];
  deniedPrograms?: string[];
  denied_programs?: string[];
  allowTerminateAny?: boolean;
  allow_terminate_any?: boolean;
  onlyTerminateOwn?: boolean;
  only_terminate_own?: boolean;
  maxTrackedProcesses?: number;
  max_tracked_processes?: number;
  defaultTimeoutSecs?: number;
  default_timeout_secs?: number;
}

function firstDefined<T>(...values: Array<T | undefined>): T | undefined {
  return values.find((value) => value !== undefined);
}

function normalizeProcessInfo(process: BackendProcessInfo): ProcessInfo {
  return {
    pid: process.pid,
    name: process.name,
    exePath: firstDefined(process.exePath, process.exe_path),
    cmdLine: firstDefined(process.cmdLine, process.cmd_line),
    parentPid: firstDefined(process.parentPid, process.parent_pid),
    cpuPercent: firstDefined(process.cpuPercent, process.cpu_percent),
    memoryBytes: firstDefined(process.memoryBytes, process.memory_bytes),
    status: process.status,
    startTime: firstDefined(process.startTime, process.start_time),
    user: process.user,
    cwd: process.cwd,
  };
}

function normalizeProcessConfig(config: BackendProcessConfig): ProcessManagerConfig {
  return {
    enabled: config.enabled ?? false,
    allowedPrograms: firstDefined(config.allowedPrograms, config.allowed_programs) ?? [],
    deniedPrograms: firstDefined(config.deniedPrograms, config.denied_programs) ?? [],
    allowTerminateAny: firstDefined(config.allowTerminateAny, config.allow_terminate_any) ?? false,
    onlyTerminateOwn: firstDefined(config.onlyTerminateOwn, config.only_terminate_own) ?? true,
    maxTrackedProcesses:
      firstDefined(config.maxTrackedProcesses, config.max_tracked_processes) ?? 100,
    defaultTimeoutSecs: firstDefined(config.defaultTimeoutSecs, config.default_timeout_secs) ?? 30,
  };
}

function normalizeStartResult(result: BackendStartProcessResult): StartProcessResult {
  return {
    success: result.success,
    pid: result.pid,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: firstDefined(result.exitCode, result.exit_code),
    error: result.error,
    durationMs: firstDefined(result.durationMs, result.duration_ms),
  };
}

function normalizeTerminateResult(result: BackendTerminateProcessResult): TerminateProcessResult {
  return {
    success: result.success,
    exitCode: firstDefined(result.exitCode, result.exit_code),
    error: result.error,
  };
}

function normalizeStartBatchResult(result: BackendStartProcessBatchResult): StartProcessBatchResult {
  return {
    total: result.total,
    successCount: firstDefined(result.successCount, result.success_count) ?? 0,
    failureCount: firstDefined(result.failureCount, result.failure_count) ?? 0,
    results: result.results.map((item) => ({
      index: item.index,
      program: item.program,
      result: normalizeStartResult(item.result),
    })),
  };
}

function normalizeTerminateBatchResult(
  result: BackendTerminateProcessBatchResult
): TerminateProcessBatchResult {
  return {
    total: result.total,
    successCount: firstDefined(result.successCount, result.success_count) ?? 0,
    failureCount: firstDefined(result.failureCount, result.failure_count) ?? 0,
    results: result.results.map((item) => ({
      index: item.index,
      pid: item.pid,
      result: normalizeTerminateResult(item.result),
    })),
  };
}

function normalizeOperationKind(kind?: BackendProcessOperationKind): ProcessOperationType | undefined {
  if (!kind) return undefined;
  if (kind === 'startBatch' || kind === 'StartBatch' || kind === 'start_batch') return 'startBatch';
  if (kind === 'terminateBatch' || kind === 'TerminateBatch' || kind === 'terminate_batch') return 'terminateBatch';
  return undefined;
}

function normalizeOperationResult(
  result?: BackendProcessOperationResult
): ProcessOperationResult | undefined {
  if (!result) return undefined;

  const taggedKind = normalizeOperationKind(result.kind);
  if (taggedKind === 'startBatch' && result.payload) {
    return { kind: 'startBatch', payload: normalizeStartBatchResult(result.payload as BackendStartProcessBatchResult) };
  }
  if (taggedKind === 'terminateBatch' && result.payload) {
    return {
      kind: 'terminateBatch',
      payload: normalizeTerminateBatchResult(result.payload as BackendTerminateProcessBatchResult),
    };
  }

  if (result.startBatch || result.StartBatch) {
    return {
      kind: 'startBatch',
      payload: normalizeStartBatchResult((result.startBatch ?? result.StartBatch) as BackendStartProcessBatchResult),
    };
  }
  if (result.terminateBatch || result.TerminateBatch) {
    return {
      kind: 'terminateBatch',
      payload: normalizeTerminateBatchResult(
        (result.terminateBatch ?? result.TerminateBatch) as BackendTerminateProcessBatchResult
      ),
    };
  }

  return undefined;
}

function normalizeOperation(operation: BackendProcessOperation): ProcessOperation {
  const operationType = normalizeOperationKind(
    firstDefined(operation.operationType, operation.operation_type) as BackendProcessOperationKind | undefined
  );
  const operationResult = normalizeOperationResult(operation.result);

  return {
    operationId: firstDefined(operation.operationId, operation.operation_id) ?? '',
    operationType: operationType ?? (operationResult?.kind ?? 'startBatch'),
    status: operation.status,
    createdAt: firstDefined(operation.createdAt, operation.created_at) ?? 0,
    startedAt: firstDefined(operation.startedAt, operation.started_at),
    completedAt: firstDefined(operation.completedAt, operation.completed_at),
    error: operation.error,
    result: operationResult,
  };
}

function toBackendFilter(filter?: ProcessFilter): Record<string, unknown> | undefined {
  if (!filter) return undefined;
  return {
    ...filter,
    parent_pid: filter.parentPid,
    min_cpu: filter.minCpu,
    min_memory: filter.minMemory,
    sort_by: filter.sortBy,
    sort_desc: filter.sortDesc,
  };
}

function toBackendStartRequest(request: StartProcessRequest): Record<string, unknown> {
  return {
    ...request,
    timeout_secs: request.timeoutSecs,
    capture_output: request.captureOutput,
  };
}

function toBackendTerminateRequest(request: TerminateProcessRequest): Record<string, unknown> {
  return {
    ...request,
    timeout_secs: request.timeoutSecs,
  };
}

function toBackendStartBatchRequest(request: StartProcessBatchRequest): BackendStartProcessBatchRequest {
  return {
    requests: request.requests.map((item) => toBackendStartRequest(item)),
    maxConcurrency: request.maxConcurrency,
    max_concurrency: request.maxConcurrency,
  };
}

function toBackendTerminateBatchRequest(
  request: TerminateProcessBatchRequest
): BackendTerminateProcessBatchRequest {
  return {
    requests: request.requests.map((item) => toBackendTerminateRequest(item)),
    maxConcurrency: request.maxConcurrency,
    max_concurrency: request.maxConcurrency,
  };
}

function toBackendProcessConfig(config: ProcessManagerConfig): Record<string, unknown> {
  return {
    ...config,
    allowed_programs: config.allowedPrograms,
    denied_programs: config.deniedPrograms,
    allow_terminate_any: config.allowTerminateAny,
    only_terminate_own: config.onlyTerminateOwn,
    max_tracked_processes: config.maxTrackedProcesses,
    default_timeout_secs: config.defaultTimeoutSecs,
  };
}

/** Check if process management is available */
export function isProcessManagementAvailable(): boolean {
  return isTauri();
}

/** List running processes */
export async function listProcesses(filter?: ProcessFilter): Promise<ProcessInfo[]> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  const result = await invoke<BackendProcessInfo[]>('process_list', { filter: toBackendFilter(filter) });
  return result.map(normalizeProcessInfo);
}

/** Get process by PID */
export async function getProcess(pid: number): Promise<ProcessInfo | null> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  const result = await invoke<BackendProcessInfo | null>('process_get', { pid });
  return result ? normalizeProcessInfo(result) : null;
}

/** Start a new process */
export async function startProcess(request: StartProcessRequest): Promise<StartProcessResult> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  const result = await invoke<BackendStartProcessResult>('process_start', {
    request: toBackendStartRequest(request),
  });
  return normalizeStartResult(result);
}

/** Terminate a process */
export async function terminateProcess(request: TerminateProcessRequest): Promise<TerminateProcessResult> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  const result = await invoke<BackendTerminateProcessResult>('process_terminate', {
    request: toBackendTerminateRequest(request),
  });
  return normalizeTerminateResult(result);
}

/** Start multiple processes in parallel */
export async function startProcessBatch(
  request: StartProcessBatchRequest
): Promise<StartProcessBatchResult> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  const result = await invoke<BackendStartProcessBatchResult>('process_start_batch', {
    request: toBackendStartBatchRequest(request),
  });
  return normalizeStartBatchResult(result);
}

/** Terminate multiple processes in parallel */
export async function terminateProcessBatch(
  request: TerminateProcessBatchRequest
): Promise<TerminateProcessBatchResult> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  const result = await invoke<BackendTerminateProcessBatchResult>('process_terminate_batch', {
    request: toBackendTerminateBatchRequest(request),
  });
  return normalizeTerminateBatchResult(result);
}

/** Submit async start batch operation */
export async function startProcessBatchAsync(request: StartProcessBatchRequest): Promise<ProcessOperation> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  const result = await invoke<BackendProcessOperation>('process_start_batch_async', {
    request: toBackendStartBatchRequest(request),
  });
  return normalizeOperation(result);
}

/** Submit async terminate batch operation */
export async function terminateProcessBatchAsync(
  request: TerminateProcessBatchRequest
): Promise<ProcessOperation> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  const result = await invoke<BackendProcessOperation>('process_terminate_batch_async', {
    request: toBackendTerminateBatchRequest(request),
  });
  return normalizeOperation(result);
}

/** Get async operation details by ID */
export async function getProcessOperation(operationId: string): Promise<ProcessOperation | null> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  const result = await invoke<BackendProcessOperation | null>('process_get_operation', {
    operationId,
    operation_id: operationId,
  });
  return result ? normalizeOperation(result) : null;
}

/** List async operations (most recent first) */
export async function listProcessOperations(limit?: number): Promise<ProcessOperation[]> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  const result = await invoke<BackendProcessOperation[]>('process_list_operations', { limit });
  return result.map(normalizeOperation);
}

/** Get process manager configuration */
export async function getProcessConfig(): Promise<ProcessManagerConfig> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  const result = await invoke<BackendProcessConfig>('process_get_config');
  return normalizeProcessConfig(result);
}

/** Update process manager configuration */
export async function updateProcessConfig(config: ProcessManagerConfig): Promise<void> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  return invoke('process_update_config', { config: toBackendProcessConfig(config) });
}

/** Check if a program is allowed */
export async function isProgramAllowed(program: string): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }
  return invoke<boolean>('process_is_allowed', { program });
}

/** Get tracked processes (those started by this app) */
export async function getTrackedProcesses(): Promise<number[]> {
  if (!isTauri()) {
    return [];
  }
  return invoke<number[]>('process_get_tracked');
}

/** Check if process management is enabled */
export async function isProcessEnabled(): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }
  return invoke<boolean>('process_is_enabled');
}

/** Enable or disable process management */
export async function setProcessEnabled(enabled: boolean): Promise<void> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  return invoke('process_set_enabled', { enabled });
}

/** Search processes by name */
export async function searchProcesses(name: string, limit?: number): Promise<ProcessInfo[]> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  const result = await invoke<BackendProcessInfo[]>('process_search', { name, limit });
  return result.map(normalizeProcessInfo);
}

/** Get processes sorted by memory usage */
export async function getTopMemoryProcesses(limit?: number): Promise<ProcessInfo[]> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  const result = await invoke<BackendProcessInfo[]>('process_top_memory', { limit });
  return result.map(normalizeProcessInfo);
}

/** Process management service object for convenience */
export const processService = {
  isAvailable: isProcessManagementAvailable,
  list: listProcesses,
  get: getProcess,
  start: startProcess,
  terminate: terminateProcess,
  startBatch: startProcessBatch,
  terminateBatch: terminateProcessBatch,
  startBatchAsync: startProcessBatchAsync,
  terminateBatchAsync: terminateProcessBatchAsync,
  getOperation: getProcessOperation,
  listOperations: listProcessOperations,
  getConfig: getProcessConfig,
  updateConfig: updateProcessConfig,
  isProgramAllowed,
  getTracked: getTrackedProcesses,
  isEnabled: isProcessEnabled,
  setEnabled: setProcessEnabled,
  search: searchProcesses,
  topMemory: getTopMemoryProcesses,
};
