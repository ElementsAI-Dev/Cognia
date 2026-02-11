/**
 * Git Repository Operations
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../utils';
import type {
  GitRepoInfo,
  GitInitOptions,
  GitCloneOptions,
  GitOperationResult,
} from '@/types/system/git';

/** Initialize a new Git repository */
export async function initRepo(options: GitInitOptions): Promise<GitOperationResult<GitRepoInfo>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitRepoInfo>>('git_init', { options });
}

/** Clone a Git repository */
export async function cloneRepo(options: GitCloneOptions): Promise<GitOperationResult<GitRepoInfo>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitRepoInfo>>('git_clone', { options });
}

/** Get repository status */
export async function getRepoStatus(repoPath: string): Promise<GitOperationResult<GitRepoInfo>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitRepoInfo>>('git_status', { repoPath });
}

/** Check if a path is a Git repository */
export async function isGitRepo(path: string): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }

  try {
    return await invoke<boolean>('git_is_repo', { path });
  } catch {
    return false;
  }
}

/** Get full repository status in a single call
 * This combines repo info, branches, commits, file status, stash list, and remotes
 * Reduces 5+ IPC calls to 1 for better performance */
export async function getFullStatus(
  repoPath: string,
  maxCommits?: number
): Promise<GitOperationResult<import('@/types/system/git').GitFullStatus>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<import('@/types/system/git').GitFullStatus>>(
    'git_full_status',
    { repoPath, maxCommits }
  );
}
