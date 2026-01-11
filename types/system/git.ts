/**
 * Git Integration Types
 *
 * Type definitions for Git-based project management:
 * - Git installation detection and management
 * - Repository operations (init, clone, commit, push, pull)
 * - Version history for chat sessions and designer projects
 * - Branch management
 */

/** Git installation status */
export type GitInstallationStatus =
  | 'not_installed'
  | 'installed'
  | 'installing'
  | 'error'
  | 'checking';

/** Git repository status */
export type GitRepoStatus =
  | 'not_initialized'
  | 'clean'
  | 'dirty'
  | 'ahead'
  | 'behind'
  | 'diverged'
  | 'error';

/** Git operation status */
export type GitOperationStatus =
  | 'idle'
  | 'pending'
  | 'running'
  | 'success'
  | 'error';

/** Platform type */
export type Platform = 'windows' | 'macos' | 'linux' | 'unknown';

/** Git tool status */
export interface GitStatus {
  installed: boolean;
  version: string | null;
  path: string | null;
  status: GitInstallationStatus;
  error: string | null;
  lastChecked: string | null;
}

/** Git repository info */
export interface GitRepoInfo {
  path: string;
  isGitRepo: boolean;
  status: GitRepoStatus;
  branch: string | null;
  remoteName: string | null;
  remoteUrl: string | null;
  ahead: number;
  behind: number;
  hasUncommittedChanges: boolean;
  hasUntrackedFiles: boolean;
  lastCommit: GitCommitInfo | null;
}

/** Git commit information */
export interface GitCommitInfo {
  hash: string;
  shortHash: string;
  author: string;
  authorEmail: string;
  date: string;
  message: string;
  messageBody?: string;
}

/** Git file status */
export interface GitFileStatus {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'ignored';
  staged: boolean;
  oldPath?: string; // For renames
}

/** Git branch info */
export interface GitBranchInfo {
  name: string;
  isRemote: boolean;
  isCurrent: boolean;
  upstream?: string;
  lastCommit?: GitCommitInfo;
}

/** Git remote info */
export interface GitRemoteInfo {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

/** Git diff info */
export interface GitDiffInfo {
  path: string;
  additions: number;
  deletions: number;
  content?: string;
}

/** Git operation progress */
export interface GitOperationProgress {
  operation: GitOperationType;
  stage: 'preparing' | 'running' | 'finishing' | 'done' | 'error';
  progress: number; // 0-100
  message: string;
  error: string | null;
}

/** Git operation type */
export type GitOperationType =
  | 'init'
  | 'clone'
  | 'commit'
  | 'push'
  | 'pull'
  | 'fetch'
  | 'checkout'
  | 'branch'
  | 'merge'
  | 'stash'
  | 'reset'
  | 'status';

/** Git init options */
export interface GitInitOptions {
  path: string;
  initialBranch?: string;
  bare?: boolean;
}

/** Git clone options */
export interface GitCloneOptions {
  url: string;
  targetPath: string;
  branch?: string;
  depth?: number; // Shallow clone
  recursive?: boolean; // Include submodules
}

/** Git commit options */
export interface GitCommitOptions {
  repoPath: string;
  message: string;
  description?: string;
  author?: string;
  email?: string;
  amend?: boolean;
  allowEmpty?: boolean;
  files?: string[]; // Specific files to commit, empty = all staged
}

/** Git push options */
export interface GitPushOptions {
  repoPath: string;
  remote?: string;
  branch?: string;
  force?: boolean;
  setUpstream?: boolean;
  tags?: boolean;
}

/** Git pull options */
export interface GitPullOptions {
  repoPath: string;
  remote?: string;
  branch?: string;
  rebase?: boolean;
  noCommit?: boolean;
}

/** Git checkout options */
export interface GitCheckoutOptions {
  repoPath: string;
  target: string; // Branch name or commit hash
  createBranch?: boolean;
  force?: boolean;
}

/** Git branch options */
export interface GitBranchOptions {
  repoPath: string;
  name: string;
  startPoint?: string;
  delete?: boolean;
  force?: boolean;
}

/** Git stash options */
export interface GitStashOptions {
  repoPath: string;
  action: 'save' | 'pop' | 'apply' | 'drop' | 'list' | 'clear';
  message?: string;
  includeUntracked?: boolean;
  stashIndex?: number;
}

/** Git reset options */
export interface GitResetOptions {
  repoPath: string;
  mode: 'soft' | 'mixed' | 'hard';
  target?: string; // Commit hash or HEAD~n
}

/** Git log options */
export interface GitLogOptions {
  repoPath: string;
  maxCount?: number;
  skip?: number;
  since?: string;
  until?: string;
  author?: string;
  grep?: string;
  path?: string;
}

/** Git merge options */
export interface GitMergeOptions {
  repoPath: string;
  branch: string;
  noCommit?: boolean;
  noFf?: boolean; // No fast-forward
  squash?: boolean;
  message?: string;
}

/** Git config */
export interface GitConfig {
  userName: string | null;
  userEmail: string | null;
  defaultBranch: string | null;
  editor: string | null;
}

/** Git install commands per platform */
export interface GitInstallCommands {
  windows: {
    check: string;
    install: string[];
    postInstall?: string[];
  };
  macos: {
    check: string;
    install: string[];
    postInstall?: string[];
  };
  linux: {
    check: string;
    install: string[];
    postInstall?: string[];
  };
}

/** Platform-specific Git installation commands */
export const GIT_INSTALL_COMMANDS: GitInstallCommands = {
  windows: {
    check: 'git --version',
    install: [
      'winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements',
    ],
    postInstall: [
      // Refresh PATH after installation
    ],
  },
  macos: {
    check: 'git --version',
    install: [
      // Xcode command line tools includes git
      'xcode-select --install',
      // Or via Homebrew
      'brew install git',
    ],
  },
  linux: {
    check: 'git --version',
    install: [
      // Ubuntu/Debian
      'sudo apt-get update && sudo apt-get install -y git',
    ],
  },
};

/** Git tool info */
export const GIT_TOOL_INFO = {
  id: 'git',
  name: 'Git',
  description: 'Distributed version control system for tracking changes in source code',
  icon: '📦',
  category: 'version_control' as const,
  website: 'https://git-scm.com/',
  docsUrl: 'https://git-scm.com/doc',
};

// ==================== Project Git Integration Types ====================

/** Project Git configuration */
export interface ProjectGitConfig {
  enabled: boolean;
  repoPath: string | null;
  autoCommit: boolean;
  autoCommitInterval: number; // minutes, 0 = disabled
  commitOnSessionEnd: boolean;
  commitOnExport: boolean;
  includeChatHistory: boolean;
  includeDesignerProjects: boolean;
  includeWorkflows: boolean;
  excludePatterns: string[];
  remoteUrl: string | null;
  branch: string;
}

/** Default project Git config */
export function createDefaultProjectGitConfig(): ProjectGitConfig {
  return {
    enabled: false,
    repoPath: null,
    autoCommit: false,
    autoCommitInterval: 30,
    commitOnSessionEnd: true,
    commitOnExport: true,
    includeChatHistory: true,
    includeDesignerProjects: true,
    includeWorkflows: true,
    excludePatterns: ['node_modules', '.env', '*.log'],
    remoteUrl: null,
    branch: 'main',
  };
}

/** Chat session Git metadata */
export interface SessionGitMetadata {
  sessionId: string;
  commitHash: string | null;
  branch: string | null;
  lastSyncedAt: string | null;
  isDirty: boolean;
}

/** Designer project Git metadata */
export interface DesignerGitMetadata {
  projectId: string;
  commitHash: string | null;
  branch: string | null;
  lastSyncedAt: string | null;
  isDirty: boolean;
  versionHistory: DesignerVersionEntry[];
}

/** Designer version entry */
export interface DesignerVersionEntry {
  id: string;
  commitHash: string;
  message: string;
  timestamp: string;
  codeSnapshot?: string;
  thumbnail?: string;
}

// ==================== Git Operation Results ====================

/** Git operation result */
export interface GitOperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  output?: string;
}

/** Git status result */
export type GitStatusResult = GitOperationResult<GitRepoInfo>;

/** Git log result */
export type GitLogResult = GitOperationResult<GitCommitInfo[]>;

/** Git branch list result */
export type GitBranchListResult = GitOperationResult<GitBranchInfo[]>;

/** Git diff result */
export type GitDiffResult = GitOperationResult<GitDiffInfo[]>;

/** Git file status result */
export type GitFileStatusResult = GitOperationResult<GitFileStatus[]>;

// ==================== Helper Functions ====================

/** Create default Git status */
export function createDefaultGitStatus(): GitStatus {
  return {
    installed: false,
    version: null,
    path: null,
    status: 'checking',
    error: null,
    lastChecked: null,
  };
}

/** Create default Git repo info */
export function createDefaultGitRepoInfo(path: string): GitRepoInfo {
  return {
    path,
    isGitRepo: false,
    status: 'not_initialized',
    branch: null,
    remoteName: null,
    remoteUrl: null,
    ahead: 0,
    behind: 0,
    hasUncommittedChanges: false,
    hasUntrackedFiles: false,
    lastCommit: null,
  };
}

/** Parse Git version string */
export function parseGitVersion(versionString: string): string | null {
  const match = versionString.match(/git version (\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

/** Format commit message for display */
export function formatCommitMessage(commit: GitCommitInfo, maxLength = 50): string {
  const message = commit.message.split('\n')[0];
  if (message.length <= maxLength) return message;
  return message.slice(0, maxLength - 3) + '...';
}

/** Format relative time for commits */
export function formatCommitDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

/** Get Git status badge color */
export function getGitStatusColor(status: GitRepoStatus): string {
  switch (status) {
    case 'clean':
      return 'green';
    case 'dirty':
      return 'yellow';
    case 'ahead':
      return 'blue';
    case 'behind':
      return 'orange';
    case 'diverged':
      return 'red';
    case 'not_initialized':
      return 'gray';
    case 'error':
      return 'red';
    default:
      return 'gray';
  }
}

/** Get file status icon */
export function getFileStatusIcon(status: GitFileStatus['status']): string {
  switch (status) {
    case 'added':
      return '+';
    case 'modified':
      return 'M';
    case 'deleted':
      return 'D';
    case 'renamed':
      return 'R';
    case 'copied':
      return 'C';
    case 'untracked':
      return '?';
    case 'ignored':
      return '!';
    default:
      return ' ';
  }
}

// ==================== Auto-commit Configuration ====================

/** Auto-commit trigger types */
export type AutoCommitTrigger =
  | 'interval'
  | 'session_end'
  | 'message_count'
  | 'export'
  | 'manual';

/** Auto-commit configuration */
export interface AutoCommitConfig {
  enabled: boolean;
  triggers: AutoCommitTrigger[];
  intervalMinutes: number;
  messageThreshold: number;
  commitMessageTemplate: string;
  includeTimestamp: boolean;
  includeSessionTitle: boolean;
}

/** Default auto-commit config */
export function createDefaultAutoCommitConfig(): AutoCommitConfig {
  return {
    enabled: false,
    triggers: ['session_end', 'export'],
    intervalMinutes: 30,
    messageThreshold: 10,
    commitMessageTemplate: 'Auto-commit: {{action}} - {{timestamp}}',
    includeTimestamp: true,
    includeSessionTitle: true,
  };
}

/** Generate auto-commit message */
export function generateAutoCommitMessage(
  config: AutoCommitConfig,
  context: {
    action: string;
    sessionTitle?: string;
    messageCount?: number;
  }
): string {
  let message = config.commitMessageTemplate;
  
  message = message.replace('{{action}}', context.action);
  
  if (config.includeTimestamp) {
    message = message.replace('{{timestamp}}', new Date().toISOString());
  }
  
  if (config.includeSessionTitle && context.sessionTitle) {
    message = message.replace('{{session}}', context.sessionTitle);
  }
  
  if (context.messageCount !== undefined) {
    message = message.replace('{{messageCount}}', String(context.messageCount));
  }
  
  return message;
}
