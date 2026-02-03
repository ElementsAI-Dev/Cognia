/**
 * Git Service - Interface to Tauri backend for Git operations
 *
 * Provides functions for:
 * - Detecting Git installation and managing installation
 * - Repository operations (init, clone, commit, push, pull)
 * - Version control for chat history and designer projects
 * - Branch and remote management
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { isTauri } from './utils';
import { loggers } from '@/lib/logger';

const log = loggers.native;
import type {
  GitStatus,
  GitRepoInfo,
  GitCommitInfo,
  GitBranchInfo,
  GitRemoteInfo,
  GitFileStatus,
  GitDiffInfo,
  GitOperationProgress,
  GitConfig,
  GitInitOptions,
  GitCloneOptions,
  GitCommitOptions,
  GitPushOptions,
  GitPullOptions,
  GitCheckoutOptions,
  GitBranchOptions,
  GitStashOptions,
  GitResetOptions,
  GitLogOptions,
  GitMergeOptions,
  GitOperationResult,
  Platform,
  GitOperationRecord,
  GitReflogEntry,
  GitCredential,
  GitCredentialInput,
  SshKeyInfo,
} from '@/types/system/git';

// ==================== Git Installation Management ====================

/** Check if Git service is available (requires Tauri) */
export function isGitAvailable(): boolean {
  return isTauri();
}

/** Get current platform */
export async function getPlatform(): Promise<Platform> {
  if (!isTauri()) {
    return 'unknown';
  }

  try {
    const platform = await invoke<string>('git_get_platform');
    return platform as Platform;
  } catch {
    return 'unknown';
  }
}

/** Check if Git is installed */
export async function checkGitInstalled(): Promise<GitStatus> {
  if (!isTauri()) {
    return {
      installed: false,
      version: null,
      path: null,
      status: 'error',
      error: 'Git management requires Tauri desktop environment',
      lastChecked: new Date().toISOString(),
    };
  }

  try {
    return await invoke<GitStatus>('git_check_installed');
  } catch (error) {
    return {
      installed: false,
      version: null,
      path: null,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      lastChecked: new Date().toISOString(),
    };
  }
}

/** Install Git */
export async function installGit(): Promise<GitStatus> {
  if (!isTauri()) {
    throw new Error('Git installation requires Tauri desktop environment');
  }

  return invoke<GitStatus>('git_install');
}

/** Open Git website for manual installation */
export async function openGitWebsite(): Promise<void> {
  if (!isTauri()) {
    window.open('https://git-scm.com/downloads', '_blank');
    return;
  }

  return invoke('git_open_website');
}

/** Get Git configuration */
export async function getGitConfig(): Promise<GitConfig> {
  if (!isTauri()) {
    throw new Error('Git configuration requires Tauri desktop environment');
  }

  return invoke<GitConfig>('git_get_config');
}

/** Set Git configuration */
export async function setGitConfig(config: Partial<GitConfig>): Promise<void> {
  if (!isTauri()) {
    throw new Error('Git configuration requires Tauri desktop environment');
  }

  return invoke('git_set_config', { config });
}

// ==================== Repository Operations ====================

/** Initialize a new Git repository */
export async function initRepo(options: GitInitOptions): Promise<GitOperationResult<GitRepoInfo>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitRepoInfo>>('git_init', { options });
}

/** Clone a Git repository */
export async function cloneRepo(options: GitCloneOptions): Promise<GitOperationResult<GitRepoInfo>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitRepoInfo>>('git_clone', { options });
}

/** Get repository status */
export async function getRepoStatus(repoPath: string): Promise<GitOperationResult<GitRepoInfo>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitRepoInfo>>('git_status', { repoPath });
}

/** Check if a path is a Git repository */
export async function isGitRepo(path: string): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }

  try {
    return await invoke<boolean>('git_is_repo', { path });
  } catch {
    return false;
  }
}

/** Get full repository status in a single call
 * This combines repo info, branches, commits, file status, stash list, and remotes
 * Reduces 5+ IPC calls to 1 for better performance */
export async function getFullStatus(
  repoPath: string,
  maxCommits?: number
): Promise<GitOperationResult<import('@/types/system/git').GitFullStatus>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<import('@/types/system/git').GitFullStatus>>(
    'git_full_status',
    { repoPath, maxCommits }
  );
}

// ==================== Commit Operations ====================

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

// ==================== Remote Operations ====================

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

// ==================== Branch Operations ====================

/** Get branches */
export async function getBranches(repoPath: string, includeRemote?: boolean): Promise<GitOperationResult<GitBranchInfo[]>> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult<GitBranchInfo[]>>('git_branches', { repoPath, includeRemote });
}

/** Create a branch */
export async function createBranch(options: GitBranchOptions): Promise<GitOperationResult> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult>('git_create_branch', { options });
}

/** Delete a branch */
export async function deleteBranch(options: GitBranchOptions): Promise<GitOperationResult> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult>('git_delete_branch', { options: { ...options, delete: true } });
}

/** Checkout a branch or commit */
export async function checkout(options: GitCheckoutOptions): Promise<GitOperationResult> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult>('git_checkout', { options });
}

/** Merge a branch */
export async function merge(options: GitMergeOptions): Promise<GitOperationResult> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult>('git_merge', { options });
}

// ==================== Stash Operations ====================

/** Stash changes */
export async function stash(options: GitStashOptions): Promise<GitOperationResult> {
  if (!isTauri()) {
    throw new Error('Git operations require Tauri desktop environment');
  }

  return invoke<GitOperationResult>('git_stash', { options });
}

// ==================== Reset Operations ====================

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

// ==================== Event Listeners ====================

/** Listen for Git operation progress events */
export async function onGitProgress(
  callback: (progress: GitOperationProgress) => void
): Promise<UnlistenFn> {
  if (!isTauri()) {
    return () => {};
  }

  return listen<GitOperationProgress>('git-operation-progress', (event) => {
    callback(event.payload);
  });
}

/** Listen for Git installation progress events */
export async function onGitInstallProgress(
  callback: (progress: GitOperationProgress) => void
): Promise<UnlistenFn> {
  if (!isTauri()) {
    return () => {};
  }

  return listen<GitOperationProgress>('git-install-progress', (event) => {
    callback(event.payload);
  });
}

// ==================== High-Level Operations for Project Integration ====================

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

// ==================== Git Blame Operations ====================

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

// ==================== Git History & Undo ====================

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

// ==================== Service Object ====================

/** Git service object for convenient access */
export const gitService = {
  // Availability
  isAvailable: isGitAvailable,
  getPlatform,
  
  // Installation
  checkInstalled: checkGitInstalled,
  install: installGit,
  openWebsite: openGitWebsite,
  
  // Configuration
  getConfig: getGitConfig,
  setConfig: setGitConfig,
  
  // Repository
  init: initRepo,
  clone: cloneRepo,
  getStatus: getRepoStatus,
  getFullStatus,
  isRepo: isGitRepo,
  
  // Staging
  stage: stageFiles,
  stageAll,
  unstage: unstageFiles,
  
  // Commits
  commit,
  getLog,
  getFileStatus,
  getDiff,
  getDiffBetween,
  getDiffFile,
  
  // Remote
  push,
  pull,
  fetch,
  getRemotes,
  addRemote,
  removeRemote,
  
  // Branches
  getBranches,
  createBranch,
  deleteBranch,
  checkout,
  merge,
  
  // Stash
  stash,
  getStashList,
  
  // Reset
  reset,
  discardChanges,
  
  // Events
  onProgress: onGitProgress,
  onInstallProgress: onGitInstallProgress,
  
  // High-level operations
  initProjectRepo,
  autoCommit,
  exportChatToGit,
  exportDesignerToGit,
  restoreChatFromGit,
  restoreDesignerFromGit,
  
  // Blame (for agent trace integration)
  blame: getBlame,
  blameLine: getBlameLine,
  
  // History & Undo
  recordOperation,
  getOperationById,
  getRepositoriesWithHistory,
  getHistory: getOperationHistory,
  undoLast: undoLastOperation,
  clearHistory: clearOperationHistory,
  getReflog,
  recoverToReflog,
  
  // Credentials
  listCredentials,
  setCredential,
  removeCredential,
  detectSshKeys,
  testCredential,
};

export default gitService;

// ==================== Git Credentials Management ====================

/** List all stored Git credentials (sensitive data excluded) */
export async function listCredentials(): Promise<GitCredential[]> {
  if (!isTauri()) {
    return [];
  }

  try {
    return await invoke<GitCredential[]>('git_list_credentials');
  } catch (error) {
    log.error('Failed to list Git credentials', error as Error);
    return [];
  }
}

/** Add or update a Git credential */
export async function setCredential(
  input: GitCredentialInput
): Promise<GitCredential> {
  if (!isTauri()) {
    throw new Error('Git credentials require Tauri desktop environment');
  }

  return invoke<GitCredential>('git_set_credential', { input });
}

/** Remove a Git credential by host */
export async function removeCredential(host: string): Promise<boolean> {
  if (!isTauri()) {
    throw new Error('Git credentials require Tauri desktop environment');
  }

  return invoke<boolean>('git_remove_credential', { host });
}

/** Detect available SSH keys on the system */
export async function detectSshKeys(): Promise<SshKeyInfo[]> {
  if (!isTauri()) {
    return [];
  }

  try {
    return await invoke<SshKeyInfo[]>('git_detect_ssh_keys');
  } catch (error) {
    log.error('Failed to detect SSH keys', error as Error);
    return [];
  }
}

/** Test if a credential is valid */
export async function testCredential(host: string): Promise<boolean> {
  if (!isTauri()) {
    throw new Error('Git credentials require Tauri desktop environment');
  }

  return invoke<boolean>('git_test_credential', { host });
}
