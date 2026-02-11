/**
 * Git History & Undo Operations
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../utils';
import type {
  GitOperationRecord,
  GitReflogEntry,
  GitOperationResult,
} from '@/types/system/git';

/**
 * Record a new Git operation for history tracking.
 * Operations are automatically tracked with timestamps and can be undone later.
 */
export async function recordOperation(
  operationType: GitOperationRecord['operationType'],
  repoPath: string,
  description: string,
  options?: {
    beforeRef?: string;
    afterRef?: string;
    affectedFiles?: string[];
  }
): Promise<GitOperationRecord> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationRecord>('git_record_operation', {
    operationType,
    repoPath,
    description,
    beforeRef: options?.beforeRef ?? null,
    afterRef: options?.afterRef ?? null,
    affectedFiles: options?.affectedFiles ?? [],
  });
}

/**
 * Get a specific operation by ID.
 */
export async function getOperationById(id: string): Promise<GitOperationRecord | null> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationRecord | null>('git_get_operation', { id });
}

/**
 * Get all repositories that have operation history.
 */
export async function getRepositoriesWithHistory(): Promise<string[]> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<string[]>('git_get_repositories');
}

/**
 * Get operation history for a repository.
 * Returns recorded Git operations that can potentially be undone.
 */
export async function getOperationHistory(
  repoPath: string,
  limit?: number
): Promise<GitOperationRecord[]> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationRecord[]>('git_get_history', {
    repoPath,
    limit,
  });
}

/**
 * Undo the last undoable Git operation in a repository.
 * Supports undoing: commit, checkout, reset, stage, unstage.
 */
export async function undoLastOperation(
  repoPath: string
): Promise<GitOperationResult<void>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<void>>('git_undo_last', {
    repoPath,
  });
}

/**
 * Clear operation history for a repository.
 */
export async function clearOperationHistory(repoPath: string): Promise<void> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<void>('git_clear_history', {
    repoPath,
  });
}

/**
 * Get Git reflog entries for a repository.
 * Useful for recovering lost commits or branches.
 */
export async function getReflog(
  repoPath: string,
  maxCount?: number
): Promise<GitOperationResult<GitReflogEntry[]>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitReflogEntry[]>>('git_reflog', {
    repoPath,
    maxCount,
  });
}

/**
 * Recover to a specific reflog entry.
 * WARNING: This performs a hard reset to the specified ref.
 */
export async function recoverToReflog(
  repoPath: string,
  selector: string
): Promise<GitOperationResult<void>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<void>>('git_recover_to_reflog', {
    repoPath,
    selector,
  });
}
