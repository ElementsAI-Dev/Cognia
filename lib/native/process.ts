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

/** Check if process management is available */
export function isProcessManagementAvailable(): boolean {
  return isTauri();
}

/** List running processes */
export async function listProcesses(filter?: ProcessFilter): Promise<ProcessInfo[]> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  return invoke<ProcessInfo[]>('process_list', { filter });
}

/** Get process by PID */
export async function getProcess(pid: number): Promise<ProcessInfo | null> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  return invoke<ProcessInfo | null>('process_get', { pid });
}

/** Start a new process */
export async function startProcess(request: StartProcessRequest): Promise<StartProcessResult> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  return invoke<StartProcessResult>('process_start', { request });
}

/** Terminate a process */
export async function terminateProcess(request: TerminateProcessRequest): Promise<TerminateProcessResult> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  return invoke<TerminateProcessResult>('process_terminate', { request });
}

/** Get process manager configuration */
export async function getProcessConfig(): Promise<ProcessManagerConfig> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  return invoke<ProcessManagerConfig>('process_get_config');
}

/** Update process manager configuration */
export async function updateProcessConfig(config: ProcessManagerConfig): Promise<void> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  return invoke('process_update_config', { config });
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
  return invoke<ProcessInfo[]>('process_search', { name, limit });
}

/** Get processes sorted by memory usage */
export async function getTopMemoryProcesses(limit?: number): Promise<ProcessInfo[]> {
  if (!isTauri()) {
    throw new Error('Process management requires Tauri environment');
  }
  return invoke<ProcessInfo[]>('process_top_memory', { limit });
}

/** Process management service object for convenience */
export const processService = {
  isAvailable: isProcessManagementAvailable,
  list: listProcesses,
  get: getProcess,
  start: startProcess,
  terminate: terminateProcess,
  getConfig: getProcessConfig,
  updateConfig: updateProcessConfig,
  isProgramAllowed,
  getTracked: getTrackedProcesses,
  isEnabled: isProcessEnabled,
  setEnabled: setProcessEnabled,
  search: searchProcesses,
  topMemory: getTopMemoryProcesses,
};
