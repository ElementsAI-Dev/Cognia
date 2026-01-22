/**
 * Jupyter Kernel Service
 *
 * Provides interface to Tauri backend for Jupyter kernel management.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { isTauri } from '@/lib/native/utils';
import type {
  JupyterSession,
  KernelInfo,
  KernelSandboxExecutionResult,
  VariableInfo,
  KernelProgressEvent,
  CellOutputEvent,
  CreateSessionOptions,
  NotebookExecutionOptions,
} from '@/types/system/jupyter';

/** Check if kernel management is available */
export function isKernelAvailable(): boolean {
  return isTauri();
}

/** Get cached variables (without querying the kernel) */
export async function getCachedVariables(
  sessionId: string
): Promise<VariableInfo[]> {
  if (!isTauri()) {
    return [];
  }

  try {
    return await invoke<VariableInfo[]>('jupyter_get_cached_variables', {
      sessionId,
    });
  } catch {
    return [];
  }
}

// ==================== Session Management ====================

/** Create a new Jupyter session with a kernel */
export async function createSession(
  options: CreateSessionOptions
): Promise<JupyterSession> {
  if (!isTauri()) {
    throw new Error('Jupyter kernel requires Tauri environment');
  }

  // Optionally ensure kernel is installed
  if (options.autoInstallKernel) {
    await ensureKernel(options.envPath);
  }

  return invoke<JupyterSession>('jupyter_create_session', {
    name: options.name,
    envPath: options.envPath,
  });
}

/** List all active sessions */
export async function listSessions(): Promise<JupyterSession[]> {
  if (!isTauri()) {
    return [];
  }

  try {
    return await invoke<JupyterSession[]>('jupyter_list_sessions');
  } catch {
    return [];
  }
}

/** Get a session by ID */
export async function getSession(
  sessionId: string
): Promise<JupyterSession | null> {
  if (!isTauri()) {
    return null;
  }

  try {
    return await invoke<JupyterSession | null>('jupyter_get_session', {
      sessionId,
    });
  } catch {
    return null;
  }
}

/** Delete a session and stop its kernel */
export async function deleteSession(sessionId: string): Promise<void> {
  if (!isTauri()) {
    throw new Error('Jupyter kernel requires Tauri environment');
  }

  return invoke('jupyter_delete_session', { sessionId });
}

// ==================== Kernel Management ====================

/** List all active kernels */
export async function listKernels(): Promise<KernelInfo[]> {
  if (!isTauri()) {
    return [];
  }

  try {
    return await invoke<KernelInfo[]>('jupyter_list_kernels');
  } catch {
    return [];
  }
}

/** Restart a kernel in a session */
export async function restartKernel(sessionId: string): Promise<void> {
  if (!isTauri()) {
    throw new Error('Jupyter kernel requires Tauri environment');
  }

  return invoke('jupyter_restart_kernel', { sessionId });
}

/** Interrupt a kernel execution */
export async function interruptKernel(sessionId: string): Promise<void> {
  if (!isTauri()) {
    throw new Error('Jupyter kernel requires Tauri environment');
  }

  return invoke('jupyter_interrupt_kernel', { sessionId });
}

// ==================== Code Execution ====================

/** Execute code in a session's kernel */
export async function execute(
  sessionId: string,
  code: string
): Promise<KernelSandboxExecutionResult> {
  if (!isTauri()) {
    throw new Error('Jupyter kernel requires Tauri environment');
  }

  return invoke<KernelSandboxExecutionResult>('jupyter_execute', {
    sessionId,
    code,
  });
}

/** Execute code directly in an environment (without session) */
export async function quickExecute(
  envPath: string,
  code: string
): Promise<KernelSandboxExecutionResult> {
  if (!isTauri()) {
    throw new Error('Jupyter kernel requires Tauri environment');
  }

  return invoke<KernelSandboxExecutionResult>('jupyter_quick_execute', {
    envPath,
    code,
  });
}

/** Execute a notebook cell by index */
export async function executeCell(
  sessionId: string,
  cellIndex: number,
  code: string
): Promise<KernelSandboxExecutionResult> {
  if (!isTauri()) {
    throw new Error('Jupyter kernel requires Tauri environment');
  }

  return invoke<KernelSandboxExecutionResult>('jupyter_execute_cell', {
    sessionId,
    cellIndex,
    code,
  });
}

/** Execute all cells in a notebook */
export async function executeNotebook(
  sessionId: string,
  cells: string[],
  options?: NotebookExecutionOptions
): Promise<KernelSandboxExecutionResult[]> {
  if (!isTauri()) {
    throw new Error('Jupyter kernel requires Tauri environment');
  }

  return invoke<KernelSandboxExecutionResult[]>(
    'jupyter_execute_notebook',
    options ? { sessionId, cells, options } : { sessionId, cells }
  );
}

// ==================== Variable Inspection ====================

/** Get variables from a session's kernel namespace */
export async function getVariables(
  sessionId: string
): Promise<VariableInfo[]> {
  if (!isTauri()) {
    return [];
  }

  try {
    return await invoke<VariableInfo[]>('jupyter_get_variables', {
      sessionId,
    });
  } catch {
    return [];
  }
}

/** Inspect a specific variable */
export async function inspectVariable(
  sessionId: string,
  variableName: string
): Promise<KernelSandboxExecutionResult> {
  if (!isTauri()) {
    throw new Error('Jupyter kernel requires Tauri environment');
  }

  return invoke<KernelSandboxExecutionResult>('jupyter_inspect_variable', {
    sessionId,
    variableName,
  });
}

// ==================== Utility Functions ====================

/** Check if a kernel can be started for an environment */
export async function checkKernelAvailable(envPath: string): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }

  try {
    return await invoke<boolean>('jupyter_check_kernel_available', {
      envPath,
    });
  } catch {
    return false;
  }
}

/** Install ipykernel in an environment if not present */
export async function ensureKernel(envPath: string): Promise<boolean> {
  if (!isTauri()) {
    throw new Error('Jupyter kernel requires Tauri environment');
  }

  return invoke<boolean>('jupyter_ensure_kernel', { envPath });
}

/** Shutdown all kernels */
export async function shutdownAll(): Promise<void> {
  if (!isTauri()) {
    return;
  }

  return invoke('jupyter_shutdown_all');
}

// ==================== Event Listeners ====================

/** Listen for kernel status events */
export async function onKernelStatus(
  callback: (event: KernelProgressEvent) => void
): Promise<UnlistenFn> {
  if (!isTauri()) {
    return () => {};
  }

  return listen<KernelProgressEvent>('jupyter-kernel-status', (event) => {
    callback(event.payload);
  });
}

/** Listen for kernel output events */
export async function onKernelOutput(
  callback: (result: KernelSandboxExecutionResult) => void
): Promise<UnlistenFn> {
  if (!isTauri()) {
    return () => {};
  }

  return listen<KernelSandboxExecutionResult>('jupyter-output', (event) => {
    callback(event.payload);
  });
}

/** Listen for cell output events */
export async function onCellOutput(
  callback: (event: CellOutputEvent) => void
): Promise<UnlistenFn> {
  if (!isTauri()) {
    return () => {};
  }

  return listen<CellOutputEvent>('jupyter-cell-output', (event) => {
    callback(event.payload);
  });
}

// ==================== Service Object ====================

/** Kernel service object for convenient access */
export const kernelService = {
  isAvailable: isKernelAvailable,
  // Session management
  createSession,
  listSessions,
  getSession,
  deleteSession,
  // Kernel management
  listKernels,
  restartKernel,
  interruptKernel,
  // Code execution
  execute,
  quickExecute,
  executeCell,
  executeNotebook,
  // Variable inspection
  getVariables,
  getCachedVariables,
  inspectVariable,
  // Utility
  checkKernelAvailable,
  ensureKernel,
  shutdownAll,
  // Events
  onKernelStatus,
  onKernelOutput,
  onCellOutput,
};

export default kernelService;
