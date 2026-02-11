/**
 * Git Installation & Configuration
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../utils';
import type {
  GitStatus,
  GitConfig,
  Platform,
} from '@/types/system/git';

/** Check if Git service is available (requires Tauri) */
export function isGitAvailable(): boolean {
  return isTauri();
}

/** Get current platform */
export async function getPlatform(): Promise<Platform> {
  if (!isTauri()) {
    return 'unknown';
  }

  try {
    const platform = await invoke<string>('git_get_platform');
    return platform as Platform;
  } catch {
    return 'unknown';
  }
}

/** Check if Git is installed */
export async function checkGitInstalled(): Promise<GitStatus> {
  if (!isTauri()) {
    return {
      installed: false,
      version: null,
      path: null,
      status: 'error',
      error: 'Git management requires Tauri desktop environment',
      lastChecked: new Date().toISOString(),
    };
  }

  try {
    return await invoke<GitStatus>('git_check_installed');
  } catch (error) {
    return {
      installed: false,
      version: null,
      path: null,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      lastChecked: new Date().toISOString(),
    };
  }
}

/** Install Git */
export async function installGit(): Promise<GitStatus> {
  if (!isTauri()) {
    throw new Error('Git installation requires Tauri desktop environment');
  }

  return invoke<GitStatus>('git_install');
}

/** Open Git website for manual installation */
export async function openGitWebsite(): Promise<void> {
  if (!isTauri()) {
    window.open('https://git-scm.com/downloads', '_blank');
    return;
  }

  return invoke('git_open_website');
}

/** Get Git configuration */
export async function getGitConfig(): Promise<GitConfig> {
  if (!isTauri()) {
    throw new Error('Git configuration requires Tauri desktop environment');
  }

  return invoke<GitConfig>('git_get_config');
}

/** Set Git configuration */
export async function setGitConfig(config: Partial<GitConfig>): Promise<void> {
  if (!isTauri()) {
    throw new Error('Git configuration requires Tauri desktop environment');
  }

  return invoke('git_set_config', { config });
}
