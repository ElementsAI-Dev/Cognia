/**
 * Git2 Native Library Operations
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../utils';
import type {
  GitRepoInfo,
  GitCommitInfo,
  GitBranchInfo,
  GitFileStatus,
  GitOperationResult,
} from '@/types/system/git';

/** Check if git2 native library is available */
export async function git2IsAvailable(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    return await invoke<boolean>('git2_is_available');
  } catch {
    return false;
  }
}

/** Check if a path is a git repo (using git2) */
export async function git2IsRepo(path: string): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    return await invoke<boolean>('git2_is_repo', { path });
  } catch {
    return false;
  }
}

/** Get repository status using git2 native library */
export async function git2GetStatus(
  path: string
): Promise<GitOperationResult<GitRepoInfo>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }
  try {
    return await invoke<GitOperationResult<GitRepoInfo>>('git2_get_status', { path });
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/** Get file status using git2 native library */
export async function git2GetFileStatus(
  path: string
): Promise<GitOperationResult<GitFileStatus[]>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }
  try {
    return await invoke<GitOperationResult<GitFileStatus[]>>('git2_get_file_status', { path });
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/** Get branches using git2 native library */
export async function git2GetBranches(
  path: string
): Promise<GitOperationResult<GitBranchInfo[]>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }
  try {
    return await invoke<GitOperationResult<GitBranchInfo[]>>('git2_get_branches', { path });
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/** Stage files using git2 native library */
export async function git2StageFiles(
  path: string,
  files: string[]
): Promise<GitOperationResult<void>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }
  try {
    return await invoke<GitOperationResult<void>>('git2_stage_files', { path, files });
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/** Stage all files using git2 native library */
export async function git2StageAll(
  path: string
): Promise<GitOperationResult<void>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }
  try {
    return await invoke<GitOperationResult<void>>('git2_stage_all', { path });
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/** Create a commit using git2 native library */
export async function git2CreateCommit(
  path: string,
  message: string
): Promise<GitOperationResult<GitCommitInfo>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }
  try {
    return await invoke<GitOperationResult<GitCommitInfo>>('git2_create_commit', { path, message });
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/** Initialize a repository using git2 native library */
export async function git2InitRepo(
  path: string
): Promise<GitOperationResult<void>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }
  try {
    return await invoke<GitOperationResult<void>>('git2_init_repo', { path });
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/** Fetch from remote using git2 native library */
export async function git2FetchRemote(
  path: string,
  remote?: string
): Promise<GitOperationResult<void>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }
  try {
    return await invoke<GitOperationResult<void>>('git2_fetch_remote', { path, remote });
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
