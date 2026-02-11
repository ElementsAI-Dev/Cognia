/**
 * Git Tag Operations
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../utils';
import { loggers } from '@/lib/logger';
import type {
  GitTagInfo,
  GitTagCreateOptions,
  GitOperationResult,
} from '@/types/system/git';

const log = loggers.native;

/** List all tags in a repository */
export async function getTagList(
  repoPath: string
): Promise<GitOperationResult<GitTagInfo[]>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }

  try {
    return await invoke<GitOperationResult<GitTagInfo[]>>('git_tag_list', { repoPath });
  } catch (error) {
    log.error('Failed to list tags', error as Error);
    return { success: false, error: String(error) };
  }
}

/** Create a new tag */
export async function createTag(
  options: GitTagCreateOptions
): Promise<GitOperationResult<GitTagInfo>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }

  try {
    return await invoke<GitOperationResult<GitTagInfo>>('git_tag_create', { options });
  } catch (error) {
    log.error('Failed to create tag', error as Error);
    return { success: false, error: String(error) };
  }
}

/** Delete a tag */
export async function deleteTag(
  repoPath: string,
  name: string
): Promise<GitOperationResult<void>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }

  try {
    return await invoke<GitOperationResult<void>>('git_tag_delete', { repoPath, name });
  } catch (error) {
    log.error('Failed to delete tag', error as Error);
    return { success: false, error: String(error) };
  }
}

/** Push a tag to remote */
export async function pushTag(
  repoPath: string,
  name: string,
  remote?: string
): Promise<GitOperationResult<void>> {
  if (!isTauri()) {
    return { success: false, error: 'Requires Tauri desktop environment' };
  }

  try {
    return await invoke<GitOperationResult<void>>('git_tag_push', { repoPath, name, remote });
  } catch (error) {
    log.error('Failed to push tag', error as Error);
    return { success: false, error: String(error) };
  }
}
