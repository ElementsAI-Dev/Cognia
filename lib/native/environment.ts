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
