/**
 * Jupyter Kernel Types
 *
 * Type definitions for Jupyter kernel management and execution.
 */

/** Kernel status */
export type KernelStatus =
  | 'starting'
  | 'idle'
  | 'busy'
  | 'dead'
  | 'restarting'
  | 'interrupting'
  | 'stopping'
  | 'configuring'
  | 'installing'
  | 'error';

/** Kernel information */
export interface KernelInfo {
  id: string;
  name: string;
  envPath: string;
  status: KernelStatus;
  pythonVersion: string | null;
  executionCount: number;
  createdAt: string;
  lastActivityAt: string | null;
}

/** Jupyter session */
export interface JupyterSession {
  id: string;
  name: string;
  kernelId: string | null;
  envPath: string;
  createdAt: string;
  lastActivityAt: string | null;
  metadata: Record<string, unknown>;
}

/** Display data from kernel output */
export interface DisplayData {
  mimeType: string;
  data: string;
}

/** Execution error */
export interface ExecutionError {
  ename: string;
  evalue: string;
  traceback: string[];
}

/** Kernel execution result */
export interface KernelSandboxExecutionResult {
  success: boolean;
  executionCount: number;
  stdout: string;
  stderr: string;
  displayData: DisplayData[];
  error: ExecutionError | null;
  executionTimeMs: number;
}

/** Variable information */
export interface VariableInfo {
  name: string;
  type: string;
  value: string;
  size: string | null;
}

/** Kernel progress event */
export interface KernelProgressEvent {
  kernelId: string;
  status: KernelStatus;
  executionCount: number;
  message: string | null;
}

/** Cell output event */
export interface CellOutputEvent {
  sessionId?: string;
  kernelId?: string;
  cellIndex: number;
  result: KernelSandboxExecutionResult;
  total?: number;
}

/** Kernel configuration (frontend) */
export interface KernelConfig {
  timeoutSecs: number;
  maxOutputSize: number;
  startupTimeoutSecs: number;
  idleTimeoutSecs: number;
}

/** Default kernel configuration */
export const DEFAULT_KERNEL_CONFIG: KernelConfig = {
  timeoutSecs: 60,
  maxOutputSize: 1024 * 1024, // 1MB
  startupTimeoutSecs: 30,
  idleTimeoutSecs: 3600, // 1 hour
};

/** Kernel service configuration (Tauri backend) */
export interface KernelServiceConfig {
  /** Execution timeout in seconds */
  timeout_secs?: number;
  /** Max output size in bytes */
  max_output_size?: number;
  /** Timeout for kernel startup in seconds */
  startup_timeout_secs?: number;
  /** Timeout for idle kernels before cleanup in seconds */
  idle_timeout_secs?: number;
  /** Maximum number of kernels */
  max_kernels?: number;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Whether REPL can auto-install missing packages during execution */
  auto_install_packages?: boolean;

  /** Legacy compatibility fields */
  execution_timeout_secs?: number;
  max_output_bytes?: number;
}

export interface NormalizedKernelServiceConfig {
  timeoutSecs: number;
  maxOutputSize: number;
  startupTimeoutSecs: number;
  idleTimeoutSecs: number;
  maxKernels: number;
  verbose: boolean;
  autoInstallPackages: boolean;
}

/** Notebook file metadata */
export interface NotebookFileInfo {
  path: string;
  fileName: string;
  sizeBytes: number;
  cellCount: number;
  codeCells: number;
  markdownCells: number;
  kernelName: string;
  nbformat: number;
}

/** Jupyter cell type */
export type JupyterCellType = 'code' | 'markdown' | 'raw';

/** Jupyter cell execution state */
export type CellExecutionState = 'idle' | 'running' | 'queued' | 'error' | 'success';

/** Enhanced Jupyter cell with execution state */
export interface ExecutableCell {
  id: string;
  type: JupyterCellType;
  source: string;
  executionState: CellExecutionState;
  executionCount: number | null;
  outputs: CellOutput[];
  metadata: Record<string, unknown>;
}

/** Cell output types */
export type CellOutputType = 'stream' | 'execute_result' | 'display_data' | 'error';

/** Cell output */
export interface CellOutput {
  outputType: CellOutputType;
  name?: string; // for stream output: 'stdout' | 'stderr'
  text?: string; // for stream output
  data?: Record<string, string>; // for display_data and execute_result
  executionCount?: number; // for execute_result
  ename?: string; // for error
  evalue?: string; // for error
  traceback?: string[]; // for error
}

/** Notebook execution options */
export interface NotebookExecutionOptions {
  stopOnError: boolean;
  timeout: number;
  clearOutputs: boolean;
}

/** Default notebook execution options */
export const DEFAULT_EXECUTION_OPTIONS: NotebookExecutionOptions = {
  stopOnError: true,
  timeout: 60000,
  clearOutputs: true,
};

export function normalizeKernelServiceConfig(
  config: KernelServiceConfig | null | undefined
): NormalizedKernelServiceConfig {
  const timeoutSecs = config?.timeout_secs ?? config?.execution_timeout_secs ?? 60;
  const maxOutputSize = config?.max_output_size ?? config?.max_output_bytes ?? 1024 * 1024;

  return {
    timeoutSecs,
    maxOutputSize,
    startupTimeoutSecs: config?.startup_timeout_secs ?? 30,
    idleTimeoutSecs: config?.idle_timeout_secs ?? 3600,
    maxKernels: config?.max_kernels ?? 32,
    verbose: config?.verbose ?? false,
    autoInstallPackages: config?.auto_install_packages ?? false,
  };
}

/** Session creation options */
export interface CreateSessionOptions {
  name: string;
  envPath: string;
  autoInstallKernel?: boolean;
}

/** Execution history entry */
export interface ExecutionHistoryEntry {
  id: string;
  sessionId: string;
  code: string;
  result: KernelSandboxExecutionResult;
  timestamp: string;
}

/** Session-environment mapping */
export interface SessionEnvMapping {
  chatSessionId: string;
  jupyterSessionId: string;
  envPath: string;
  createdAt: string;
}

/** Helper to check if execution was successful */
export function isExecutionSuccessful(result: KernelSandboxExecutionResult): boolean {
  return result.success && !result.error;
}

/** Helper to extract text output from execution result */
export function getTextOutput(result: KernelSandboxExecutionResult): string {
  if (result.stdout) {
    return result.stdout;
  }
  if (result.displayData.length > 0) {
    const textData = result.displayData.find((d) => d.mimeType === 'text/plain');
    if (textData) {
      return textData.data;
    }
  }
  return '';
}

/** Helper to extract HTML output from execution result */
export function getHtmlOutput(result: KernelSandboxExecutionResult): string | null {
  const htmlData = result.displayData.find((d) => d.mimeType === 'text/html');
  return htmlData?.data ?? null;
}

/** Helper to extract image output from execution result */
export function getImageOutput(result: KernelSandboxExecutionResult): string | null {
  const imageData = result.displayData.find(
    (d) => d.mimeType === 'image/png' || d.mimeType === 'image/jpeg'
  );
  return imageData?.data ?? null;
}

/** Helper to format error for display */
export function formatExecutionError(error: ExecutionError): string {
  if (error.traceback.length > 0) {
    return error.traceback.join('\n');
  }
  return `${error.ename}: ${error.evalue}`;
}

/** Helper to create a default session */
export function createDefaultSession(name: string, envPath: string): Partial<JupyterSession> {
  return {
    name,
    envPath,
    kernelId: null,
    createdAt: new Date().toISOString(),
    lastActivityAt: null,
    metadata: {},
  };
}

/** Helper to format execution time */
export function formatExecutionTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1);
  return `${minutes}m ${seconds}s`;
}
