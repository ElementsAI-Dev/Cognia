/**
 * Git Remote Operations
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../utils';
import type {
  GitRemoteInfo,
  GitPushOptions,
  GitPullOptions,
  GitOperationResult,
} from '@/types/system/git';

/** Push changes to remote */
export async function push(options: GitPushOptions): Promise<GitOperationResult> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult>('git_push', { options });
}

/** Pull changes from remote */
export async function pull(options: GitPullOptions): Promise<GitOperationResult> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult>('git_pull', { options });
}

/** Fetch from remote */
export async function fetch(repoPath: string, remote?: string): Promise<GitOperationResult> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult>('git_fetch', { repoPath, remote });
}

/** Get remote info */
export async function getRemotes(repoPath: string): Promise<GitOperationResult<GitRemoteInfo[]>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitRemoteInfo[]>>('git_remotes', { repoPath });
}

/** Add a remote */
export async function addRemote(repoPath: string, name: string, url: string): Promise<GitOperationResult> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult>('git_add_remote', { repoPath, name, url });
}

/** Remove a remote */
export async function removeRemote(repoPath: string, name: string): Promise<GitOperationResult> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult>('git_remove_remote', { repoPath, name });
}
