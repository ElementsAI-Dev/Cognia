/**
 * Git Graph, Stats & Checkpoint Operations
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../utils';
import type {
  GitGraphCommit,
  GitRepoStats,
  GitCheckpoint,
  GitOperationResult,
} from '@/types/system/git';

// ==================== Graph API ====================

/** Get commit log with parent hashes for graph rendering */
export async function getLogGraph(
  repoPath: string,
  maxCount?: number
): Promise<GitOperationResult<GitGraphCommit[]>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }
  try {
    return await invoke<GitOperationResult<GitGraphCommit[]>>('git_log_graph', {
      repoPath,
      maxCount,
    });
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ==================== Stats API ====================

/** Get repository statistics */
export async function getRepoStats(
  repoPath: string
): Promise<GitOperationResult<GitRepoStats>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }
  try {
    return await invoke<GitOperationResult<GitRepoStats>>('git_repo_stats', {
      repoPath,
    });
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ==================== Checkpoint API ====================

/** Create a checkpoint (snapshot) of current working state */
export async function checkpointCreate(
  repoPath: string,
  message?: string
): Promise<GitOperationResult<GitCheckpoint>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }
  try {
    return await invoke<GitOperationResult<GitCheckpoint>>('git_checkpoint_create', {
      repoPath,
      message,
    });
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/** List all checkpoints */
export async function checkpointList(
  repoPath: string
): Promise<GitOperationResult<GitCheckpoint[]>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }
  try {
    return await invoke<GitOperationResult<GitCheckpoint[]>>('git_checkpoint_list', {
      repoPath,
    });
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/** Restore a checkpoint (non-destructive apply) */
export async function checkpointRestore(
  repoPath: string,
  checkpointId: string
): Promise<GitOperationResult<void>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }
  try {
    return await invoke<GitOperationResult<void>>('git_checkpoint_restore', {
      repoPath,
      checkpointId,
    });
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/** Delete a checkpoint */
export async function checkpointDelete(
  repoPath: string,
  checkpointId: string
): Promise<GitOperationResult<void>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }
  try {
    return await invoke<GitOperationResult<void>>('git_checkpoint_delete', {
      repoPath,
      checkpointId,
    });
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
