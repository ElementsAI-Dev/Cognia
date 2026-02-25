/**
 * Git Commit Search — multi-mode commit search
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../utils';
import { loggers } from '@/lib/logger';
import type { GitCommitInfo, GitOperationResult } from '@/types/system/git';

const log = loggers.native;

export type GitSearchMode = 'message' | 'author' | 'hash' | 'file' | 'content';

export interface GitSearchOptions {
  repoPath: string;
  mode: GitSearchMode;
  query: string;
  maxCount?: number;
  branch?: string;
}

/**
 * Search commits by message, author, hash, file path, or code content.
 */
export async function searchCommits(
  options: GitSearchOptions,
): Promise<GitOperationResult<GitCommitInfo[]>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }

  try {
    return await invoke<GitOperationResult<GitCommitInfo[]>>('git_search_commits', {
      repoPath: options.repoPath,
      mode: options.mode,
      query: options.query,
      maxCount: options.maxCount,
      branch: options.branch,
    });
  } catch (error) {
    log.error('Failed to search commits', error as Error);
    return { success: false, error: String(error) };
  }
}
