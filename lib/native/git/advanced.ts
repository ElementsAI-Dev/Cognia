/**
 * Git Advanced Operations — revert, cherry-pick, show commit, blame
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../utils';
import { loggers } from '@/lib/logger';
import type {
  GitCommitInfo,
  GitRevertOptions,
  GitCherryPickOptions,
  GitCommitDetail,
  GitOperationResult,
} from '@/types/system/git';

const log = loggers.native;

// ==================== Revert ====================

/** Revert a commit (create a new commit that undoes changes) */
export async function revertCommit(
  options: GitRevertOptions
): Promise<GitOperationResult<GitCommitInfo>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }

  try {
    return await invoke<GitOperationResult<GitCommitInfo>>('git_revert', { options });
  } catch (error) {
    log.error('Failed to revert commit', error as Error);
    return { success: false, error: String(error) };
  }
}

/** Abort an in-progress revert */
export async function revertAbort(repoPath: string): Promise<GitOperationResult<void>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }

  try {
    return await invoke<GitOperationResult<void>>('git_revert_abort', { repoPath });
  } catch (error) {
    log.error('Failed to abort revert', error as Error);
    return { success: false, error: String(error) };
  }
}

// ==================== Cherry-pick ====================

/** Cherry-pick a commit */
export async function cherryPick(
  options: GitCherryPickOptions
): Promise<GitOperationResult<GitCommitInfo>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }

  try {
    return await invoke<GitOperationResult<GitCommitInfo>>('git_cherry_pick', { options });
  } catch (error) {
    log.error('Failed to cherry-pick commit', error as Error);
    return { success: false, error: String(error) };
  }
}

/** Abort an in-progress cherry-pick */
export async function cherryPickAbort(repoPath: string): Promise<GitOperationResult<void>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }

  try {
    return await invoke<GitOperationResult<void>>('git_cherry_pick_abort', { repoPath });
  } catch (error) {
    log.error('Failed to abort cherry-pick', error as Error);
    return { success: false, error: String(error) };
  }
}

// ==================== Show Commit ====================

/** Get full commit details including diff content */
export async function showCommit(
  repoPath: string,
  commitHash: string,
  maxLines?: number
): Promise<GitOperationResult<GitCommitDetail>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }

  try {
    return await invoke<GitOperationResult<GitCommitDetail>>('git_show_commit', {
      repoPath,
      commitHash,
      maxLines,
    });
  } catch (error) {
    log.error('Failed to show commit', error as Error);
    return { success: false, error: String(error) };
  }
}

// ==================== Blame ====================

/** Git blame line info */
export interface GitBlameLineInfo {
  lineNumber: number;
  commitHash: string;
  authorName: string;
  authorEmail: string;
  authorDate: string;
  commitMessage: string;
  content: string;
}

/** Git blame result */
export interface GitBlameResult {
  filePath: string;
  lines: GitBlameLineInfo[];
}

/**
 * Get git blame for a file - line-by-line attribution showing which commit
 * last modified each line. Used for agent trace line attribution per spec section 6.5.
 */
export async function getBlame(
  repoPath: string,
  filePath: string,
  options?: { startLine?: number; endLine?: number }
): Promise<GitOperationResult<GitBlameResult>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitBlameResult>>('git_blame', {
    repoPath,
    filePath,
    startLine: options?.startLine,
    endLine: options?.endLine,
  });
}

/**
 * Get the commit that last modified a specific line.
 * Useful for looking up agent trace attribution for a single line.
 */
export async function getBlameLine(
  repoPath: string,
  filePath: string,
  lineNumber: number
): Promise<GitOperationResult<GitBlameLineInfo>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitBlameLineInfo>>('git_blame_line', {
    repoPath,
    filePath,
    lineNumber,
  });
}
