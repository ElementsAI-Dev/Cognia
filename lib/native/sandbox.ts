/**
 * Sandbox Service - Interface to Tauri backend sandbox
 *
 * Provides code execution in Docker/Podman containers or native processes.
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  ExecutionRequest,
  SandboxExecutionResult,
  Language,
  RuntimeType,
  BackendSandboxConfig,
  SandboxStatus,
} from '@/types/system/sandbox';

/** Check if running in Tauri environment */
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Execute code in the sandbox
 */
export async function executeCode(
  request: ExecutionRequest
): Promise<SandboxExecutionResult> {
  if (!isTauri()) {
    throw new Error('Sandbox execution requires Tauri environment');
  }

  return invoke<SandboxExecutionResult>('sandbox_execute', { request });
}

/**
 * Quick execute - simplified execution for common use cases
 */
export async function quickExecute(
  language: string,
  code: string
): Promise<SandboxExecutionResult> {
  if (!isTauri()) {
    throw new Error('Sandbox execution requires Tauri environment');
  }

  return invoke<SandboxExecutionResult>('sandbox_quick_execute', { language, code });
}

/**
 * Execute with stdin input
 */
export async function executeWithStdin(
  language: string,
  code: string,
  stdin: string
): Promise<SandboxExecutionResult> {
  if (!isTauri()) {
    throw new Error('Sandbox execution requires Tauri environment');
  }

  return invoke<SandboxExecutionResult>('sandbox_execute_with_stdin', {
    language,
    code,
    stdin,
  });
}

/**
 * Get sandbox status (available runtimes, languages, config)
 */
export async function getSandboxStatus(): Promise<SandboxStatus> {
  if (!isTauri()) {
    throw new Error('Sandbox requires Tauri environment');
  }

  return invoke<SandboxStatus>('sandbox_get_status');
}

/**
 * Get sandbox configuration
 */
export async function getBackendSandboxConfig(): Promise<BackendSandboxConfig> {
  if (!isTauri()) {
    throw new Error('Sandbox requires Tauri environment');
  }

  return invoke<BackendSandboxConfig>('sandbox_get_config');
}

/**
 * Update sandbox configuration
 */
export async function updateBackendSandboxConfig(
  config: BackendSandboxConfig
): Promise<void> {
  if (!isTauri()) {
    throw new Error('Sandbox requires Tauri environment');
  }

  return invoke('sandbox_update_config', { config });
}

/**
 * Get available runtimes
 */
export async function getAvailableRuntimes(): Promise<RuntimeType[]> {
  if (!isTauri()) {
    throw new Error('Sandbox requires Tauri environment');
  }

  return invoke<RuntimeType[]>('sandbox_get_runtimes');
}

/**
 * Get supported languages
 */
export async function getSupportedLanguages(): Promise<Language[]> {
  if (!isTauri()) {
    throw new Error('Sandbox requires Tauri environment');
  }

  return invoke<Language[]>('sandbox_get_languages');
}

/**
 * Check if a specific runtime is available
 */
export async function checkRuntime(runtime: RuntimeType): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }

  return invoke<boolean>('sandbox_check_runtime', { runtime });
}

/**
 * Prepare/pull image for a language
 */
export async function prepareLanguage(language: string): Promise<void> {
  if (!isTauri()) {
    throw new Error('Sandbox requires Tauri environment');
  }

  return invoke('sandbox_prepare_language', { language });
}

/**
 * Toggle a language enabled/disabled
 */
export async function toggleLanguage(
  language: string,
  enabled: boolean
): Promise<void> {
  if (!isTauri()) {
    throw new Error('Sandbox requires Tauri environment');
  }

  return invoke('sandbox_toggle_language', { language, enabled });
}

/**
 * Set preferred runtime
 */
export async function setPreferredRuntime(runtime: RuntimeType): Promise<void> {
  if (!isTauri()) {
    throw new Error('Sandbox requires Tauri environment');
  }

  return invoke('sandbox_set_runtime', { runtime });
}

/**
 * Set default timeout
 */
export async function setDefaultTimeout(timeoutSecs: number): Promise<void> {
  if (!isTauri()) {
    throw new Error('Sandbox requires Tauri environment');
  }

  return invoke('sandbox_set_timeout', { timeout_secs: timeoutSecs });
}

/**
 * Set memory limit
 */
export async function setMemoryLimit(memoryMb: number): Promise<void> {
  if (!isTauri()) {
    throw new Error('Sandbox requires Tauri environment');
  }

  return invoke('sandbox_set_memory_limit', { memory_mb: memoryMb });
}

/**
 * Set network access
 */
export async function setNetworkEnabled(enabled: boolean): Promise<void> {
  if (!isTauri()) {
    throw new Error('Sandbox requires Tauri environment');
  }

  return invoke('sandbox_set_network', { enabled });
}

/**
 * Check if sandbox is available (Tauri environment with at least one runtime)
 */
export async function isSandboxAvailable(): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }

  try {
    const runtimes = await getAvailableRuntimes();
    return runtimes.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get runtime version information
 */
export async function getRuntimeInfo(
  runtime: RuntimeType
): Promise<[RuntimeType, string] | null> {
  if (!isTauri()) {
    return null;
  }

  return invoke<[RuntimeType, string] | null>('sandbox_get_runtime_info', {
    runtime,
  });
}

/**
 * Cleanup all runtimes (containers, temp files)
 */
export async function cleanupRuntimes(): Promise<void> {
  if (!isTauri()) {
    throw new Error('Sandbox requires Tauri environment');
  }

  return invoke('sandbox_cleanup');
}

/**
 * Execute with specific timeout and memory limits
 */
export async function executeWithLimits(
  language: string,
  code: string,
  timeoutSecs: number,
  memoryMb: number
): Promise<SandboxExecutionResult> {
  if (!isTauri()) {
    throw new Error('Sandbox execution requires Tauri environment');
  }

  return invoke<SandboxExecutionResult>('sandbox_execute_with_limits', {
    language,
    code,
    timeout_secs: timeoutSecs,
    memory_mb: memoryMb,
  });
}

/**
 * Sandbox service object for convenient access
 */
export const sandboxService = {
  execute: executeCode,
  quickExecute,
  executeWithStdin,
  executeWithLimits,
  getStatus: getSandboxStatus,
  getConfig: getBackendSandboxConfig,
  updateConfig: updateBackendSandboxConfig,
  getRuntimes: getAvailableRuntimes,
  getLanguages: getSupportedLanguages,
  checkRuntime,
  getRuntimeInfo,
  prepareLanguage,
  toggleLanguage,
  setRuntime: setPreferredRuntime,
  setTimeout: setDefaultTimeout,
  setMemoryLimit,
  setNetworkEnabled,
  cleanup: cleanupRuntimes,
  isAvailable: isSandboxAvailable,
};

export default sandboxService;
