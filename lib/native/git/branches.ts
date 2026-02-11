/**
 * Git Branch Operations
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../utils';
import { loggers } from '@/lib/logger';
import type {
  GitBranchInfo,
  GitCheckoutOptions,
  GitBranchOptions,
  GitMergeOptions,
  GitOperationResult,
} from '@/types/system/git';

const log = loggers.native;

/** Get branches */
export async function getBranches(repoPath: string, includeRemote?: boolean): Promise<GitOperationResult<GitBranchInfo[]>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitBranchInfo[]>>('git_branches', { repoPath, includeRemote });
}

/** Create a branch */
export async function createBranch(options: GitBranchOptions): Promise<GitOperationResult> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult>('git_create_branch', { options });
}

/** Delete a branch */
export async function deleteBranch(options: GitBranchOptions): Promise<GitOperationResult> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult>('git_delete_branch', { options: { ...options, delete: true } });
}

/** Checkout a branch or commit */
export async function checkout(options: GitCheckoutOptions): Promise<GitOperationResult> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult>('git_checkout', { options });
}

/** Merge a branch */
export async function merge(options: GitMergeOptions): Promise<GitOperationResult> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult>('git_merge', { options });
}

/** Rename a branch */
export async function renameBranch(
  repoPath: string,
  oldName: string,
  newName: string,
  force?: boolean
): Promise<GitOperationResult<void>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }

  try {
    return await invoke<GitOperationResult<void>>('git_rename_branch', {
      repoPath,
      oldName,
      newName,
      force,
    });
  } catch (error) {
    log.error('Failed to rename branch', error as Error);
    return { success: false, error: String(error) };
  }
}

/** Abort an in-progress merge */
export async function mergeAbort(repoPath: string): Promise<GitOperationResult<void>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }

  try {
    return await invoke<GitOperationResult<void>>('git_merge_abort', { repoPath });
  } catch (error) {
    log.error('Failed to abort merge', error as Error);
    return { success: false, error: String(error) };
  }
}
