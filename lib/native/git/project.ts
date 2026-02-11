/**
 * Git High-Level Project Operations
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../utils';
import { initRepo } from './repository';
import { stageAll, commit } from './staging';
import type {
  GitRepoInfo,
  GitCommitInfo,
  GitOperationResult,
} from '@/types/system/git';

/** Initialize Git for a project directory */
export async function initProjectRepo(
  projectPath: string,
  options?: {
    initialBranch?: string;
    gitignoreTemplate?: string;
  }
): Promise<GitOperationResult<GitRepoInfo>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  // Initialize repo
  const initResult = await initRepo({
    path: projectPath,
    initialBranch: options?.initialBranch || 'main',
  });

  if (!initResult.success) {
    return initResult;
  }

  // Create .gitignore if template provided
  if (options?.gitignoreTemplate) {
    await invoke('git_create_gitignore', {
      repoPath: projectPath,
      template: options.gitignoreTemplate,
    });
  }

  return initResult;
}

/** Commit all changes with auto-generated message */
export async function autoCommit(
  repoPath: string,
  messagePrefix: string,
  context?: string
): Promise<GitOperationResult<GitCommitInfo>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  // Stage all changes
  const stageResult = await stageAll(repoPath);
  if (!stageResult.success) {
    return { success: false, error: stageResult.error };
  }

  // Generate commit message
  const timestamp = new Date().toISOString();
  const message = context
    ? `${messagePrefix}: ${context} (${timestamp})`
    : `${messagePrefix} (${timestamp})`;

  // Commit
  return commit({
    repoPath,
    message,
    allowEmpty: false,
  });
}

/** Export chat history to Git repository */
export async function exportChatToGit(
  repoPath: string,
  sessionId: string,
  chatData: unknown,
  commitMessage?: string
): Promise<GitOperationResult<GitCommitInfo>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitCommitInfo>>('git_export_chat', {
    repoPath,
    sessionId,
    chatData: JSON.stringify(chatData),
    commitMessage,
  });
}

/** Export designer project to Git repository */
export async function exportDesignerToGit(
  repoPath: string,
  projectId: string,
  designerData: unknown,
  commitMessage?: string
): Promise<GitOperationResult<GitCommitInfo>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitCommitInfo>>('git_export_designer', {
    repoPath,
    projectId,
    designerData: JSON.stringify(designerData),
    commitMessage,
  });
}

/** Restore chat history from Git commit */
export async function restoreChatFromGit(
  repoPath: string,
  sessionId: string,
  commitHash: string
): Promise<GitOperationResult<unknown>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<unknown>>('git_restore_chat', {
    repoPath,
    sessionId,
    commitHash,
  });
}

/** Restore designer project from Git commit */
export async function restoreDesignerFromGit(
  repoPath: string,
  projectId: string,
  commitHash: string
): Promise<GitOperationResult<unknown>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<unknown>>('git_restore_designer', {
    repoPath,
    projectId,
    commitHash,
  });
}
