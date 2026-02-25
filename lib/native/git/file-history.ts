/**
 * Git File History — per-file commit history with rename tracking
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../utils';
import { loggers } from '@/lib/logger';
import type { GitCommitInfo, GitOperationResult } from '@/types/system/git';

const log = loggers.native;

/** A single commit's impact on a specific file */
export interface GitFileHistoryEntry {
  commit: GitCommitInfo;
  additions: number;
  deletions: number;
  oldPath?: string;
}

/**
 * Get commit history for a specific file with rename tracking.
 * Uses `git log --follow` under the hood.
 */
export async function getFileHistory(
  repoPath: string,
  filePath: string,
  maxCount?: number,
): Promise<GitOperationResult<GitFileHistoryEntry[]>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }

  try {
    return await invoke<GitOperationResult<GitFileHistoryEntry[]>>('git_file_history', {
      repoPath,
      filePath,
      maxCount,
    });
  } catch (error) {
    log.error('Failed to get file history', error as Error);
    return { success: false, error: String(error) };
  }
}
