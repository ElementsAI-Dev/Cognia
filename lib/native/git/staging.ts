/**
 * Git Staging, Commit & Diff Operations
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../utils';
import type {
  GitCommitInfo,
  GitFileStatus,
  GitDiffInfo,
  GitCommitOptions,
  GitLogOptions,
  GitStashOptions,
  GitResetOptions,
  GitOperationResult,
} from '@/types/system/git';

/** Stage files for commit */
export async function stageFiles(repoPath: string, files: string[]): Promise<GitOperationResult> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult>('git_stage', { repoPath, files });
}

/** Stage all changes */
export async function stageAll(repoPath: string): Promise<GitOperationResult> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult>('git_stage_all', { repoPath });
}

/** Unstage files */
export async function unstageFiles(repoPath: string, files: string[]): Promise<GitOperationResult> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult>('git_unstage', { repoPath, files });
}

/** Create a commit */
export async function commit(options: GitCommitOptions): Promise<GitOperationResult<GitCommitInfo>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitCommitInfo>>('git_commit', { options });
}

/** Get commit history */
export async function getLog(options: GitLogOptions): Promise<GitOperationResult<GitCommitInfo[]>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitCommitInfo[]>>('git_log', { options });
}

/** Get file status (staged and unstaged changes) */
export async function getFileStatus(repoPath: string): Promise<GitOperationResult<GitFileStatus[]>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitFileStatus[]>>('git_file_status', { repoPath });
}

/** Get diff for uncommitted changes */
export async function getDiff(repoPath: string, staged?: boolean): Promise<GitOperationResult<GitDiffInfo[]>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitDiffInfo[]>>('git_diff', { repoPath, staged });
}

/** Get diff between commits */
export async function getDiffBetween(
  repoPath: string,
  fromRef: string,
  toRef: string
): Promise<GitOperationResult<GitDiffInfo[]>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitDiffInfo[]>>('git_diff_between', { repoPath, fromRef, toRef });
}

/** Get diff content for a specific file */
export async function getDiffFile(
  repoPath: string,
  filePath: string,
  staged?: boolean,
  maxLines?: number
): Promise<GitOperationResult<GitDiffInfo>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitDiffInfo>>('git_diff_file', { 
    repoPath, 
    filePath, 
    staged,
    maxLines: maxLines || 5000,
  });
}

/** Stash entry from backend */
export interface GitStashEntry {
  index: number;
  message: string;
  branch?: string;
  date?: string;
}

/** Get stash list with parsed entries */
export async function getStashList(repoPath: string): Promise<GitOperationResult<GitStashEntry[]>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitStashEntry[]>>('git_stash_list', { repoPath });
}

/** Stash changes */
export async function stash(options: GitStashOptions): Promise<GitOperationResult> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult>('git_stash', { options });
}

/** Reset repository */
export async function reset(options: GitResetOptions): Promise<GitOperationResult> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult>('git_reset', { options });
}

/** Discard changes to specific files */
export async function discardChanges(repoPath: string, files: string[]): Promise<GitOperationResult> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult>('git_discard_changes', { repoPath, files });
}
