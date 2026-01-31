/**
 * Multi-VCS Service - Interface to Tauri backend for multiple VCS systems
 *
 * Supports: Git, Jujutsu (jj), Mercurial (hg), Subversion (svn)
 * Per agent-trace.dev specification section 6.4
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './utils';

// ==================== Types ====================

/** Supported VCS types per agent-trace.dev spec */
export type VcsType = 'git' | 'jj' | 'hg' | 'svn';

/** VCS info for a repository */
export interface VcsInfo {
  vcsType: VcsType;
  revision: string;
  branch: string | null;
  remoteUrl: string | null;
  repoRoot: string;
}

/** VCS installation status */
export interface VcsStatus {
  vcsType: VcsType;
  installed: boolean;
  version: string | null;
}

/** VCS blame line info */
export interface VcsBlameLineInfo {
  lineNumber: number;
  revision: string;
  author: string;
  date: string;
  content: string;
}

/** VCS operation result */
export interface VcsOperationResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

// ==================== Detection ====================

/** Check if VCS service is available (requires Tauri) */
export function isVcsAvailable(): boolean {
  return isTauri();
}

/**
 * Detect which VCS is used in a directory
 */
export async function detectVcs(path: string): Promise<VcsOperationResult<VcsType>> {
  if (!isTauri()) {
    return {
      success: false,
      data: null,
      error: 'VCS detection requires Tauri desktop environment',
    };
  }

  try {
    return await invoke<VcsOperationResult<VcsType>>('vcs_detect', { path });
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check which VCS tools are installed on the system
 */
export async function checkVcsInstalled(): Promise<VcsStatus[]> {
  if (!isTauri()) {
    return [];
  }

  try {
    return await invoke<VcsStatus[]>('vcs_check_installed');
  } catch {
    return [];
  }
}

// ==================== VCS Info ====================

/**
 * Get VCS info for a directory (auto-detects VCS type)
 */
export async function getVcsInfo(path: string): Promise<VcsOperationResult<VcsInfo>> {
  if (!isTauri()) {
    return {
      success: false,
      data: null,
      error: 'VCS operations require Tauri desktop environment',
    };
  }

  try {
    return await invoke<VcsOperationResult<VcsInfo>>('vcs_get_info', { path });
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ==================== VCS Blame ====================

/**
 * Get blame info for a file (auto-detects VCS type)
 * Supports Git, Jujutsu, Mercurial, and Subversion
 */
export async function getVcsBlame(
  repoPath: string,
  filePath: string,
  lineNumber?: number
): Promise<VcsOperationResult<VcsBlameLineInfo[]>> {
  if (!isTauri()) {
    return {
      success: false,
      data: null,
      error: 'VCS operations require Tauri desktop environment',
    };
  }

  try {
    return await invoke<VcsOperationResult<VcsBlameLineInfo[]>>('vcs_blame', {
      repoPath,
      filePath,
      lineNumber: lineNumber ?? null,
    });
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get blame info for a specific line
 */
export async function getVcsBlameLine(
  repoPath: string,
  filePath: string,
  lineNumber: number
): Promise<VcsBlameLineInfo | null> {
  const result = await getVcsBlame(repoPath, filePath, lineNumber);
  if (result.success && result.data && result.data.length > 0) {
    return result.data[0];
  }
  return null;
}

// ==================== Service Object ====================

/** VCS service object for convenient access */
export const vcsService = {
  isAvailable: isVcsAvailable,
  detect: detectVcs,
  checkInstalled: checkVcsInstalled,
  getInfo: getVcsInfo,
  blame: getVcsBlame,
  blameLine: getVcsBlameLine,
};

export default vcsService;
