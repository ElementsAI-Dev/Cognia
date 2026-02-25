/**
 * Git Service — barrel export from sub-modules
 *
 * All sub-modules are re-exported here so that existing imports
 * like `import { gitService } from '@/lib/native/git'` continue to work
 * via the parent `git.ts` file which re-exports from this directory.
 */

// Installation & Configuration
export {
  isGitAvailable,
  getPlatform,
  checkGitInstalled,
  installGit,
  openGitWebsite,
  getGitConfig,
  setGitConfig,
} from './installation';

// Repository Operations
export {
  initRepo,
  cloneRepo,
  getRepoStatus,
  isGitRepo,
  getFullStatus,
} from './repository';

// Staging, Commit & Diff
export {
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
  type GitStashEntry,
} from './staging';

// Remote Operations
export {
  push,
  pull,
  fetch,
  getRemotes,
  addRemote,
  removeRemote,
} from './remotes';

// Branch Operations
export {
  getBranches,
  createBranch,
  deleteBranch,
  checkout,
  merge,
  renameBranch,
  mergeAbort,
} from './branches';

// Advanced Operations
export {
  revertCommit,
  revertAbort,
  cherryPick,
  cherryPickAbort,
  showCommit,
  getBlame,
  getBlameLine,
  type GitBlameLineInfo,
  type GitBlameResult,
} from './advanced';

// Event Listeners
export {
  onGitProgress,
  onGitInstallProgress,
} from './events';

// Project Integration
export {
  initProjectRepo,
  autoCommit,
  exportChatToGit,
  exportDesignerToGit,
  restoreChatFromGit,
  restoreDesignerFromGit,
} from './project';

// History & Undo
export {
  recordOperation,
  getOperationById,
  getRepositoriesWithHistory,
  getOperationHistory,
  undoLastOperation,
  clearOperationHistory,
  getReflog,
  recoverToReflog,
} from './history';

// Credentials
export {
  listCredentials,
  setCredential,
  removeCredential,
  detectSshKeys,
  testCredential,
} from './credentials';

// Tags
export {
  getTagList,
  createTag,
  deleteTag,
  pushTag,
} from './tags';

// Git2 Native Library
export {
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
} from './git2';

// File History
export {
  getFileHistory,
  type GitFileHistoryEntry,
} from './file-history';

// Commit Search
export {
  searchCommits,
  type GitSearchMode,
  type GitSearchOptions,
} from './search';

// Graph, Stats, Checkpoints
export {
  getLogGraph,
  getRepoStats,
  checkpointCreate,
  checkpointList,
  checkpointRestore,
  checkpointDelete,
} from './extras';

// Re-export the restoreDesignerFromGit as restoreDesignerToGit for backward compat
export { restoreDesignerFromGit as restoreDesignerToGit } from './project';
