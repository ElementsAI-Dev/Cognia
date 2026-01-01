/**
 * Environment Service - Interface to Tauri backend for environment management
 *
 * Provides functions for:
 * - Detecting installed development tools (uv, nvm, Docker, Podman)
 * - Installing tools
 * - Managing tool versions
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { isTauri } from './utils';
import type {
  EnvironmentTool,
  ToolStatus,
  InstallProgress,
  Platform,
  PythonExecutionResult,
  PythonExecutionProgress,
  PythonExecutionOptions,
  PythonInterpreterInfo,
} from '@/types/environment';

/** Check if environment management is available */
export function isEnvironmentAvailable(): boolean {
  return isTauri();
}

/** Get current platform */
export async function getPlatform(): Promise<Platform> {
  if (!isTauri()) {
    return 'unknown';
  }

  try {
    const platform = await invoke<string>('environment_get_platform');
    return platform as Platform;
  } catch {
    return 'unknown';
  }
}

/** Check if a specific tool is installed */
export async function checkTool(tool: EnvironmentTool): Promise<ToolStatus> {
  if (!isTauri()) {
    throw new Error('Environment management requires Tauri environment');
  }

  return invoke<ToolStatus>('environment_check_tool', { tool });
}

/** Check all tools at once */
export async function checkAllTools(): Promise<ToolStatus[]> {
  if (!isTauri()) {
    throw new Error('Environment management requires Tauri environment');
  }

  return invoke<ToolStatus[]>('environment_check_all_tools');
}

/** Install a tool */
export async function installTool(tool: EnvironmentTool): Promise<ToolStatus> {
  if (!isTauri()) {
    throw new Error('Environment management requires Tauri environment');
  }

  return invoke<ToolStatus>('environment_install_tool', { tool });
}

/** Uninstall a tool */
export async function uninstallTool(tool: EnvironmentTool): Promise<boolean> {
  if (!isTauri()) {
    throw new Error('Environment management requires Tauri environment');
  }

  return invoke<boolean>('environment_uninstall_tool', { tool });
}

/** Open tool's official website */
export async function openToolWebsite(tool: EnvironmentTool): Promise<void> {
  if (!isTauri()) {
    // Fallback to window.open for browser
    const urls: Record<EnvironmentTool, string> = {
      uv: 'https://docs.astral.sh/uv/',
      nvm: 'https://github.com/nvm-sh/nvm',
      docker: 'https://www.docker.com/',
      podman: 'https://podman.io/',
      ffmpeg: 'https://ffmpeg.org/',
    };
    window.open(urls[tool], '_blank');
    return;
  }

  return invoke('environment_open_tool_website', { tool });
}

/** Get Python versions managed by uv */
export async function getPythonVersions(): Promise<string[]> {
  if (!isTauri()) {
    return [];
  }

  try {
    return await invoke<string[]>('environment_get_python_versions');
  } catch {
    return [];
  }
}

/** Get Node.js versions managed by nvm */
export async function getNodeVersions(): Promise<string[]> {
  if (!isTauri()) {
    return [];
  }

  try {
    return await invoke<string[]>('environment_get_node_versions');
  } catch {
    return [];
  }
}

/** Listen for installation progress events */
export async function onInstallProgress(
  callback: (progress: InstallProgress) => void
): Promise<UnlistenFn> {
  if (!isTauri()) {
    return () => {};
  }

  return listen<InstallProgress>('environment-install-progress', (event) => {
    callback(event.payload);
  });
}

/** Environment service object for convenient access */
export const environmentService = {
  isAvailable: isEnvironmentAvailable,
  getPlatform,
  checkTool,
  checkAllTools,
  installTool,
  uninstallTool,
  openToolWebsite,
  getPythonVersions,
  getNodeVersions,
  onInstallProgress,
};

export default environmentService;

// ==================== Virtual Environment Service ====================

import type {
  VirtualEnvInfo,
  CreateVirtualEnvOptions,
  VirtualEnvProgress,
  PackageInfo,
} from '@/types/environment';

/** Create a virtual environment */
export async function createVirtualEnv(
  options: CreateVirtualEnvOptions
): Promise<VirtualEnvInfo> {
  if (!isTauri()) {
    throw new Error('Virtual environment management requires Tauri environment');
  }

  return invoke<VirtualEnvInfo>('environment_create_venv', { options });
}

/** List all virtual environments */
export async function listVirtualEnvs(basePath?: string): Promise<VirtualEnvInfo[]> {
  if (!isTauri()) {
    return [];
  }

  try {
    return await invoke<VirtualEnvInfo[]>('environment_list_venvs', { basePath });
  } catch {
    return [];
  }
}

/** Delete a virtual environment */
export async function deleteVirtualEnv(path: string): Promise<boolean> {
  if (!isTauri()) {
    throw new Error('Virtual environment management requires Tauri environment');
  }

  return invoke<boolean>('environment_delete_venv', { path });
}

/** Get packages in a virtual environment */
export async function listPackages(envPath: string): Promise<PackageInfo[]> {
  if (!isTauri()) {
    return [];
  }

  try {
    return await invoke<PackageInfo[]>('environment_list_packages', { envPath });
  } catch {
    return [];
  }
}

/** Install packages in a virtual environment */
export async function installPackages(
  envPath: string,
  packages: string[],
  upgrade?: boolean
): Promise<boolean> {
  if (!isTauri()) {
    throw new Error('Virtual environment management requires Tauri environment');
  }

  return invoke<boolean>('environment_install_packages', { envPath, packages, upgrade });
}

/** Run a command in a virtual environment */
export async function runInVirtualEnv(
  envPath: string,
  command: string,
  cwd?: string
): Promise<string> {
  if (!isTauri()) {
    throw new Error('Virtual environment management requires Tauri environment');
  }

  return invoke<string>('environment_run_in_venv', { envPath, command, cwd });
}

/** Get available Python versions */
export async function getAvailablePythonVersions(): Promise<string[]> {
  if (!isTauri()) {
    return ['3.12', '3.11', '3.10', '3.9'];
  }

  try {
    return await invoke<string[]>('environment_get_available_python_versions');
  } catch {
    return ['3.12', '3.11', '3.10', '3.9'];
  }
}

/** Install a specific Python version */
export async function installPythonVersion(version: string): Promise<boolean> {
  if (!isTauri()) {
    throw new Error('Python version management requires Tauri environment');
  }

  return invoke<boolean>('environment_install_python_version', { version });
}

/** Listen for virtual environment progress events */
export async function onVenvProgress(
  callback: (progress: VirtualEnvProgress) => void
): Promise<UnlistenFn> {
  if (!isTauri()) {
    return () => {};
  }

  return listen<VirtualEnvProgress>('venv-progress', (event) => {
    callback(event.payload);
  });
}

// ==================== Python Execution in Virtual Environment ====================

/**
 * Execute Python code safely in a virtual environment
 * 
 * This function writes code to a temporary file and executes it using the
 * virtual environment's Python interpreter, avoiding shell injection vulnerabilities.
 */
export async function executePython(
  envPath: string,
  code: string,
  options?: PythonExecutionOptions
): Promise<PythonExecutionResult> {
  if (!isTauri()) {
    throw new Error('Python execution requires Tauri environment');
  }

  return invoke<PythonExecutionResult>('environment_execute_python', {
    envPath,
    code,
    options,
  });
}

/**
 * Execute Python code with streaming output
 * 
 * This function executes Python code and streams output in real-time via events.
 * Use onPythonExecutionOutput to listen for output events.
 */
export async function executePythonStream(
  envPath: string,
  code: string,
  executionId: string,
  options?: PythonExecutionOptions
): Promise<void> {
  if (!isTauri()) {
    throw new Error('Python execution requires Tauri environment');
  }

  return invoke<void>('environment_execute_python_stream', {
    envPath,
    code,
    executionId,
    options,
  });
}

/**
 * Execute a Python file in a virtual environment
 */
export async function executePythonFile(
  envPath: string,
  filePath: string,
  options?: PythonExecutionOptions
): Promise<PythonExecutionResult> {
  if (!isTauri()) {
    throw new Error('Python execution requires Tauri environment');
  }

  return invoke<PythonExecutionResult>('environment_execute_python_file', {
    envPath,
    filePath,
    options,
  });
}

/**
 * Get information about a virtual environment's Python interpreter
 */
export async function getPythonInfo(
  envPath: string
): Promise<PythonInterpreterInfo> {
  if (!isTauri()) {
    throw new Error('Python info requires Tauri environment');
  }

  return invoke<PythonInterpreterInfo>('environment_get_python_info', { envPath });
}

/**
 * Listen for Python execution output events (for streaming execution)
 */
export async function onPythonExecutionOutput(
  callback: (progress: PythonExecutionProgress) => void
): Promise<UnlistenFn> {
  if (!isTauri()) {
    return () => {};
  }

  return listen<PythonExecutionProgress>('python-execution-output', (event) => {
    callback(event.payload);
  });
}

/**
 * Generate a unique execution ID for streaming execution
 */
export function generateExecutionId(): string {
  return `exec-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Virtual environment service object */
export const virtualEnvService = {
  isAvailable: isEnvironmentAvailable,
  create: createVirtualEnv,
  list: listVirtualEnvs,
  delete: deleteVirtualEnv,
  listPackages,
  installPackages,
  runCommand: runInVirtualEnv,
  getAvailablePythonVersions,
  installPythonVersion,
  onProgress: onVenvProgress,
  // Python execution
  executePython,
  executePythonStream,
  executePythonFile,
  getPythonInfo,
  onPythonExecutionOutput,
  generateExecutionId,
};
