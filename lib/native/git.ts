/**
 * Git Service - Interface to Tauri backend for Git operations
 *
 * This file re-exports all functions from the `git/` sub-modules
 * and assembles the `gitService` convenience object.
 *
 * Sub-modules:
 * - installation.ts — availability, platform, install, config
 * - repository.ts  — init, clone, status
 * - staging.ts     — stage, commit, diff, stash, reset
 * - remotes.ts     — push, pull, fetch, remote CRUD
 * - branches.ts    — branch CRUD, checkout, merge, rename
 * - advanced.ts    — revert, cherry-pick, show commit, blame
 * - events.ts      — progress event listeners
 * - project.ts     — high-level project integration
 * - history.ts     — operation history & undo
 * - credentials.ts — credential management
 * - tags.ts        — tag operations
 * - git2.ts        — git2 native library
 * - extras.ts      — graph, stats, checkpoints
 */

// Re-export everything from sub-modules
export * from './git/index';

// Import all functions for the gitService convenience object
import {
  isGitAvailable,
  getPlatform,
  checkGitInstalled,
  installGit,
  openGitWebsite,
  getGitConfig,
  setGitConfig,
  initRepo,
  cloneRepo,
  getRepoStatus,
  getFullStatus,
  isGitRepo,
  stageFiles,
  stageAll,
  unstageFiles,
  commit,
  getLog,
  getFileStatus,
  getDiff,
  getDiffBetween,
  getDiffFile,
  getStashList,
  stash,
  reset,
  discardChanges,
  push,
  pull,
  fetch,
  getRemotes,
  addRemote,
  removeRemote,
  getBranches,
  createBranch,
  deleteBranch,
  checkout,
  merge,
  renameBranch,
  mergeAbort,
  revertCommit,
  revertAbort,
  cherryPick,
  cherryPickAbort,
  showCommit,
  getBlame,
  getBlameLine,
  onGitProgress,
  onGitInstallProgress,
  initProjectRepo,
  autoCommit,
  exportChatToGit,
  exportDesignerToGit,
  restoreChatFromGit,
  restoreDesignerFromGit,
  recordOperation,
  getOperationById,
  getRepositoriesWithHistory,
  getOperationHistory,
  undoLastOperation,
  clearOperationHistory,
  getReflog,
  recoverToReflog,
  listCredentials,
  setCredential,
  removeCredential,
  detectSshKeys,
  testCredential,
  getTagList,
  createTag,
  deleteTag,
  pushTag,
  git2IsAvailable,
  git2IsRepo,
  git2GetStatus,
  git2GetFileStatus,
  git2GetBranches,
  git2StageFiles,
  git2StageAll,
  git2CreateCommit,
  git2InitRepo,
  git2FetchRemote,
  getLogGraph,
  getRepoStats,
  checkpointCreate,
  checkpointList,
  checkpointRestore,
  checkpointDelete,
} from './git/index';

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

  // Revert
  revert: revertCommit,
  revertAbort,

  // Tags
  getTagList,
  createTag,
  deleteTag,
  pushTag,

  // Cherry-pick
  cherryPick,
  cherryPickAbort,

  // Branch rename
  renameBranch,

  // Commit detail
  showCommit,

  // Abort operations
  mergeAbort,

  // Graph
  getLogGraph,

  // Stats
  getRepoStats,

  // Checkpoints
  checkpointCreate,
  checkpointList,
  checkpointRestore,
  checkpointDelete,

  // Git2 native library
  git2: {
    isAvailable: git2IsAvailable,
    isRepo: git2IsRepo,
    getStatus: git2GetStatus,
    getFileStatus: git2GetFileStatus,
    getBranches: git2GetBranches,
    stageFiles: git2StageFiles,
    stageAll: git2StageAll,
    createCommit: git2CreateCommit,
    initRepo: git2InitRepo,
    fetchRemote: git2FetchRemote,
  },
};

export default gitService;
