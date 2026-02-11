/**
 * Git Store - manages Git state with persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { toast } from 'sonner';
import type {
  GitStatus,
  GitRepoInfo,
  GitCommitInfo,
  GitBranchInfo,
  GitFileStatus,
  GitDiffInfo,
  GitStashEntry,
  GitOperationProgress,
  GitConfig,
  ProjectGitConfig,
  AutoCommitConfig,
  GitOperationStatus,
  GitTagInfo,
  GitRemoteInfo,
  GitCommitDetail,
  GitGraphCommit,
  GitRepoStats,
  GitCheckpoint,
} from '@/types/system/git';
import { gitService } from '@/lib/native/git';

export interface GitState {
  // Git installation status
  gitStatus: GitStatus;
  isCheckingGit: boolean;
  isInstallingGit: boolean;
  installProgress: GitOperationProgress | null;

  // Git configuration
  gitConfig: GitConfig | null;

  // Current repository
  currentRepoPath: string | null;
  currentRepoInfo: GitRepoInfo | null;

  // Repository state
  branches: GitBranchInfo[];
  commits: GitCommitInfo[];
  fileStatus: GitFileStatus[];
  stashList: { index: number; message: string; branch?: string; date?: string }[];
  remotes: GitRemoteInfo[];
  tags: GitTagInfo[];

  // Operation state
  operationStatus: GitOperationStatus;
  operationProgress: GitOperationProgress | null;
  lastError: string | null;

  // Project Git configurations (per project)
  projectConfigs: Record<string, ProjectGitConfig>;

  // Auto-commit configuration
  autoCommitConfig: AutoCommitConfig;

  // Tracked repositories
  trackedRepos: string[];

  // Graph
  graphCommits: GitGraphCommit[];

  // Stats
  repoStats: GitRepoStats | null;

  // Checkpoints
  checkpoints: GitCheckpoint[];
}

export interface GitActions {
  // Git installation
  checkGitInstalled: () => Promise<void>;
  installGit: () => Promise<void>;

  // Git configuration
  loadGitConfig: () => Promise<void>;
  updateGitConfig: (config: Partial<GitConfig>) => Promise<void>;

  // Repository management
  setCurrentRepo: (path: string | null) => void;
  loadRepoStatus: (path?: string) => Promise<void>;
  loadFullStatus: () => Promise<void>;
  initRepo: (path: string, options?: { initialBranch?: string }) => Promise<boolean>;
  cloneRepo: (
    url: string,
    targetPath: string,
    options?: { branch?: string; depth?: number }
  ) => Promise<boolean>;

  // Staging
  stageFiles: (files: string[]) => Promise<boolean>;
  stageAll: () => Promise<boolean>;
  unstageFiles: (files: string[]) => Promise<boolean>;

  // Commits
  commit: (
    message: string,
    options?: { description?: string; amend?: boolean }
  ) => Promise<boolean>;
  loadCommitHistory: (options?: { maxCount?: number }) => Promise<void>;

  // Branches
  loadBranches: () => Promise<void>;
  createBranch: (name: string, startPoint?: string) => Promise<boolean>;
  deleteBranch: (name: string, force?: boolean) => Promise<boolean>;
  checkout: (target: string, createBranch?: boolean) => Promise<boolean>;
  mergeBranch: (branch: string, options?: { noFf?: boolean; squash?: boolean }) => Promise<boolean>;

  // Commit diff
  getDiffBetween: (fromRef: string, toRef: string) => Promise<GitDiffInfo[] | null>;

  // Remote operations
  push: (options?: { force?: boolean; setUpstream?: boolean }) => Promise<boolean>;
  pull: (options?: { rebase?: boolean }) => Promise<boolean>;
  fetch: () => Promise<boolean>;

  // File operations
  loadFileStatus: () => Promise<void>;
  discardChanges: (files: string[]) => Promise<boolean>;
  getDiffContent: (filePath: string, staged?: boolean) => Promise<string | null>;

  // Stash operations
  loadStashList: () => Promise<void>;
  stashSave: (message?: string, includeUntracked?: boolean) => Promise<boolean>;
  stashPop: (index?: number) => Promise<boolean>;
  stashApply: (index?: number) => Promise<boolean>;
  stashDrop: (index?: number) => Promise<boolean>;
  stashClear: () => Promise<boolean>;

  // Remote management
  loadRemotes: () => Promise<void>;
  addRemote: (name: string, url: string) => Promise<boolean>;
  removeRemote: (name: string) => Promise<boolean>;

  // Tag operations
  loadTags: () => Promise<void>;
  createTag: (name: string, options?: { message?: string; target?: string; force?: boolean }) => Promise<boolean>;
  deleteTag: (name: string) => Promise<boolean>;
  pushTag: (name: string, remote?: string) => Promise<boolean>;

  // Revert
  revertCommit: (commitHash: string, noCommit?: boolean) => Promise<boolean>;
  revertAbort: () => Promise<boolean>;

  // Cherry-pick
  cherryPick: (commitHash: string, noCommit?: boolean) => Promise<boolean>;
  cherryPickAbort: () => Promise<boolean>;

  // Branch rename
  renameBranch: (oldName: string, newName: string, force?: boolean) => Promise<boolean>;

  // Show commit detail
  showCommit: (commitHash: string, maxLines?: number) => Promise<GitCommitDetail | null>;

  // Merge abort
  mergeAbort: () => Promise<boolean>;

  // Project Git configuration
  getProjectConfig: (projectId: string) => ProjectGitConfig;
  setProjectConfig: (projectId: string, config: Partial<ProjectGitConfig>) => void;
  enableGitForProject: (projectId: string, repoPath: string) => Promise<boolean>;
  disableGitForProject: (projectId: string) => void;

  // Auto-commit
  setAutoCommitConfig: (config: Partial<AutoCommitConfig>) => void;
  triggerAutoCommit: (projectId: string, trigger: string) => Promise<boolean>;

  // Graph
  loadGraphCommits: (maxCount?: number) => Promise<void>;

  // Stats
  loadRepoStats: () => Promise<void>;

  // Checkpoints
  createCheckpoint: (message?: string) => Promise<boolean>;
  loadCheckpoints: () => Promise<void>;
  restoreCheckpoint: (id: string) => Promise<boolean>;
  deleteCheckpoint: (id: string) => Promise<boolean>;

  // Repository tracking
  addTrackedRepo: (path: string) => void;
  removeTrackedRepo: (path: string) => void;

  // State management
  setOperationStatus: (status: GitOperationStatus) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

const initialGitStatus: GitStatus = {
  installed: false,
  version: null,
  path: null,
  status: 'checking',
  error: null,
  lastChecked: null,
};

const initialAutoCommitConfig: AutoCommitConfig = {
  enabled: false,
  triggers: ['session_end', 'export'],
  intervalMinutes: 30,
  messageThreshold: 10,
  commitMessageTemplate: 'Auto-commit: {{action}} - {{timestamp}}',
  includeTimestamp: true,
  includeSessionTitle: true,
};

const initialState: GitState = {
  gitStatus: initialGitStatus,
  isCheckingGit: false,
  isInstallingGit: false,
  installProgress: null,
  gitConfig: null,
  currentRepoPath: null,
  currentRepoInfo: null,
  branches: [],
  commits: [],
  fileStatus: [],
  stashList: [],
  remotes: [],
  tags: [],
  operationStatus: 'idle',
  operationProgress: null,
  lastError: null,
  projectConfigs: {},
  autoCommitConfig: initialAutoCommitConfig,
  trackedRepos: [],
  graphCommits: [],
  repoStats: null,
  checkpoints: [],
};

// ==================== Store Helpers ====================

type StoreGet = () => GitState & GitActions;
type StoreSet = (partial: Partial<GitState>) => void;

function errMsg(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Execute a Git operation requiring currentRepoPath with operationStatus tracking.
 * Eliminates the repetitive try/catch/set pattern used by ~28 store actions.
 */
async function runGitOp(
  get: StoreGet,
  set: StoreSet,
  op: (repoPath: string) => Promise<{ success: boolean; error?: string | null }>,
  failMsg: string,
  onSuccess?: () => Promise<void> | void,
): Promise<boolean> {
  const { currentRepoPath } = get();
  if (!currentRepoPath) return false;

  set({ operationStatus: 'running' });
  try {
    const result = await op(currentRepoPath);
    if (result.success) {
      if (onSuccess) await onSuccess();
      set({ operationStatus: 'success' });
      return true;
    }
    const errorText = result.error || failMsg;
    set({ lastError: errorText, operationStatus: 'error' });
    toast.error(failMsg, { description: result.error || undefined });
    return false;
  } catch (error) {
    const errorText = errMsg(error);
    set({ lastError: errorText, operationStatus: 'error' });
    toast.error(failMsg, { description: errorText });
    return false;
  }
}

/**
 * Load Git data requiring currentRepoPath. No operationStatus tracking.
 */
async function loadGitData<T>(
  get: StoreGet,
  set: StoreSet,
  op: (repoPath: string) => Promise<{ success: boolean; data?: T }>,
  onData: (data: T) => Partial<GitState>,
): Promise<void> {
  const { currentRepoPath } = get();
  if (!currentRepoPath) return;

  try {
    const result = await op(currentRepoPath);
    if (result.success && result.data) {
      set(onData(result.data));
    }
  } catch (error) {
    set({ lastError: errMsg(error) });
  }
}

export const useGitStore = create<GitState & GitActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Git installation
      checkGitInstalled: async () => {
        set({ isCheckingGit: true });
        try {
          const status = await gitService.checkInstalled();
          set({ gitStatus: status, isCheckingGit: false });
        } catch (error) {
          set({
            gitStatus: { ...initialGitStatus, status: 'error', error: errMsg(error), lastChecked: new Date().toISOString() },
            isCheckingGit: false,
          });
        }
      },

      installGit: async () => {
        set({ isInstallingGit: true, installProgress: null });
        try {
          const status = await gitService.install();
          set({ gitStatus: status, isInstallingGit: false, installProgress: null });
        } catch (error) {
          set({ isInstallingGit: false, lastError: errMsg(error) });
        }
      },

      // Git configuration
      loadGitConfig: async () => {
        try {
          const config = await gitService.getConfig();
          set({ gitConfig: config });
        } catch (error) {
          set({ lastError: errMsg(error) });
        }
      },

      updateGitConfig: async (config) => {
        try {
          await gitService.setConfig(config);
          const { gitConfig } = get();
          set({ gitConfig: { ...gitConfig, ...config } as GitConfig });
        } catch (error) {
          set({ lastError: errMsg(error) });
        }
      },

      // Repository management
      setCurrentRepo: (path) => {
        set({ currentRepoPath: path, currentRepoInfo: null });
        if (path) {
          get().loadRepoStatus(path);
        }
      },

      loadRepoStatus: async (path) => {
        const repoPath = path || get().currentRepoPath;
        if (!repoPath) return;

        set({ operationStatus: 'running' });
        try {
          const result = await gitService.getStatus(repoPath);
          if (result.success && result.data) {
            set({ currentRepoInfo: result.data, operationStatus: 'idle' });
          } else {
            set({ lastError: result.error || 'Failed to get repository status', operationStatus: 'error' });
          }
        } catch (error) {
          set({ lastError: errMsg(error), operationStatus: 'error' });
        }
      },

      loadFullStatus: async () => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return;

        set({ operationStatus: 'running' });
        try {
          const result = await gitService.getFullStatus(currentRepoPath);
          if (result.success && result.data) {
            set({
              currentRepoInfo: result.data.repoInfo,
              branches: result.data.branches,
              commits: result.data.commits,
              fileStatus: result.data.fileStatus,
              stashList: result.data.stashList as GitStashEntry[],
              remotes: result.data.remotes || [],
              operationStatus: 'idle',
            });
          } else {
            set({ lastError: result.error || 'Failed to get full repository status', operationStatus: 'error' });
          }
        } catch (error) {
          set({ lastError: errMsg(error), operationStatus: 'error' });
        }
      },

      initRepo: async (path, options) => {
        set({ operationStatus: 'running' });
        try {
          const result = await gitService.init({ path, initialBranch: options?.initialBranch || 'main' });
          if (result.success) {
            set({ currentRepoPath: path, currentRepoInfo: result.data || null, operationStatus: 'success' });
            get().addTrackedRepo(path);
            return true;
          }
          set({ lastError: result.error || 'Failed to initialize repository', operationStatus: 'error' });
          return false;
        } catch (error) {
          set({ lastError: errMsg(error), operationStatus: 'error' });
          return false;
        }
      },

      cloneRepo: async (url, targetPath, options) => {
        set({ operationStatus: 'running' });
        try {
          const result = await gitService.clone({ url, targetPath, branch: options?.branch, depth: options?.depth });
          if (result.success) {
            set({ currentRepoPath: targetPath, currentRepoInfo: result.data || null, operationStatus: 'success' });
            get().addTrackedRepo(targetPath);
            return true;
          }
          set({ lastError: result.error || 'Failed to clone repository', operationStatus: 'error' });
          return false;
        } catch (error) {
          set({ lastError: errMsg(error), operationStatus: 'error' });
          return false;
        }
      },

      // Staging
      stageFiles: async (files) => runGitOp(get, set,
        (rp) => gitService.stage(rp, files),
        'Failed to stage files',
        () => get().loadFileStatus(),
      ),

      stageAll: async () => runGitOp(get, set,
        (rp) => gitService.stageAll(rp),
        'Failed to stage all files',
        () => get().loadFileStatus(),
      ),

      unstageFiles: async (files) => runGitOp(get, set,
        (rp) => gitService.unstage(rp, files),
        'Failed to unstage files',
        () => get().loadFileStatus(),
      ),

      // Commits
      commit: async (message, options) => runGitOp(get, set,
        (rp) => gitService.commit({ repoPath: rp, message, description: options?.description, amend: options?.amend }),
        'Failed to commit',
        async () => { await get().loadRepoStatus(); await get().loadCommitHistory(); },
      ),

      loadCommitHistory: async (options) => loadGitData(get, set,
        (rp) => gitService.getLog({ repoPath: rp, maxCount: options?.maxCount || 50 }),
        (data) => ({ commits: data }),
      ),

      // Branches
      loadBranches: async () => loadGitData(get, set,
        (rp) => gitService.getBranches(rp, true),
        (data) => ({ branches: data }),
      ),

      createBranch: async (name, startPoint) => runGitOp(get, set,
        (rp) => gitService.createBranch({ repoPath: rp, name, startPoint }),
        'Failed to create branch',
        () => get().loadBranches(),
      ),

      deleteBranch: async (name, force) => runGitOp(get, set,
        (rp) => gitService.deleteBranch({ repoPath: rp, name, force }),
        'Failed to delete branch',
        () => get().loadBranches(),
      ),

      checkout: async (target, createBranch) => runGitOp(get, set,
        (rp) => gitService.checkout({ repoPath: rp, target, createBranch }),
        'Failed to checkout',
        async () => { await get().loadRepoStatus(); await get().loadBranches(); },
      ),

      mergeBranch: async (branch, options) => runGitOp(get, set,
        (rp) => gitService.merge({ repoPath: rp, branch, noFf: options?.noFf, squash: options?.squash }),
        'Failed to merge branch',
        async () => { await get().loadRepoStatus(); await get().loadBranches(); await get().loadCommitHistory(); },
      ),

      getDiffBetween: async (fromRef, toRef) => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return null;
        try {
          const result = await gitService.getDiffBetween(currentRepoPath, fromRef, toRef);
          return (result.success && result.data) ? result.data : null;
        } catch {
          return null;
        }
      },

      // Remote operations
      push: async (options) => runGitOp(get, set,
        (rp) => gitService.push({ repoPath: rp, force: options?.force, setUpstream: options?.setUpstream }),
        'Failed to push',
        () => get().loadRepoStatus(),
      ),

      pull: async (options) => runGitOp(get, set,
        (rp) => gitService.pull({ repoPath: rp, rebase: options?.rebase }),
        'Failed to pull',
        async () => { await get().loadRepoStatus(); await get().loadCommitHistory(); },
      ),

      fetch: async () => runGitOp(get, set,
        (rp) => gitService.fetch(rp),
        'Failed to fetch',
        () => get().loadRepoStatus(),
      ),

      // File operations
      loadFileStatus: async () => loadGitData(get, set,
        (rp) => gitService.getFileStatus(rp),
        (data) => ({ fileStatus: data }),
      ),

      discardChanges: async (files) => runGitOp(get, set,
        (rp) => gitService.discardChanges(rp, files),
        'Failed to discard changes',
        async () => { await get().loadFileStatus(); await get().loadRepoStatus(); },
      ),

      getDiffContent: async (filePath, staged) => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return null;
        try {
          const result = await gitService.getDiffFile(currentRepoPath, filePath, staged);
          return (result.success && result.data) ? result.data.content || null : null;
        } catch {
          return null;
        }
      },

      // Stash operations
      loadStashList: async () => loadGitData(get, set,
        (rp) => gitService.getStashList(rp),
        (data) => ({ stashList: data }),
      ),

      stashSave: async (message, includeUntracked) => runGitOp(get, set,
        (rp) => gitService.stash({ repoPath: rp, action: 'save', message, includeUntracked }),
        'Failed to stash changes',
        async () => { await get().loadStashList(); await get().loadFileStatus(); await get().loadRepoStatus(); },
      ),

      stashPop: async (index) => runGitOp(get, set,
        (rp) => gitService.stash({ repoPath: rp, action: 'pop', stashIndex: index }),
        'Failed to pop stash',
        async () => { await get().loadStashList(); await get().loadFileStatus(); await get().loadRepoStatus(); },
      ),

      stashApply: async (index) => runGitOp(get, set,
        (rp) => gitService.stash({ repoPath: rp, action: 'apply', stashIndex: index }),
        'Failed to apply stash',
        async () => { await get().loadFileStatus(); await get().loadRepoStatus(); },
      ),

      stashDrop: async (index) => runGitOp(get, set,
        (rp) => gitService.stash({ repoPath: rp, action: 'drop', stashIndex: index }),
        'Failed to drop stash',
        () => get().loadStashList(),
      ),

      stashClear: async () => runGitOp(get, set,
        (rp) => gitService.stash({ repoPath: rp, action: 'clear' }),
        'Failed to clear stash',
        () => { set({ stashList: [] }); },
      ),

      // Remote management
      loadRemotes: async () => loadGitData(get, set,
        (rp) => gitService.getRemotes(rp),
        (data) => ({ remotes: data }),
      ),

      addRemote: async (name, url) => runGitOp(get, set,
        (rp) => gitService.addRemote(rp, name, url),
        'Failed to add remote',
        () => get().loadRemotes(),
      ),

      removeRemote: async (name) => runGitOp(get, set,
        (rp) => gitService.removeRemote(rp, name),
        'Failed to remove remote',
        () => get().loadRemotes(),
      ),

      // Tag operations
      loadTags: async () => loadGitData(get, set,
        (rp) => gitService.getTagList(rp),
        (data) => ({ tags: data }),
      ),

      createTag: async (name, options) => runGitOp(get, set,
        (rp) => gitService.createTag({ repoPath: rp, name, message: options?.message, target: options?.target, force: options?.force }),
        'Failed to create tag',
        () => get().loadTags(),
      ),

      deleteTag: async (name) => runGitOp(get, set,
        (rp) => gitService.deleteTag(rp, name),
        'Failed to delete tag',
        () => get().loadTags(),
      ),

      pushTag: async (name, remote) => runGitOp(get, set,
        (rp) => gitService.pushTag(rp, name, remote),
        'Failed to push tag',
      ),

      // Revert
      revertCommit: async (commitHash, noCommit) => runGitOp(get, set,
        (rp) => gitService.revert({ repoPath: rp, commitHash, noCommit }),
        'Failed to revert commit',
        async () => { await get().loadRepoStatus(); await get().loadCommitHistory(); await get().loadFileStatus(); },
      ),

      revertAbort: async () => runGitOp(get, set,
        (rp) => gitService.revertAbort(rp),
        'Failed to abort revert',
        async () => { await get().loadRepoStatus(); await get().loadFileStatus(); },
      ),

      // Cherry-pick
      cherryPick: async (commitHash, noCommit) => runGitOp(get, set,
        (rp) => gitService.cherryPick({ repoPath: rp, commitHash, noCommit }),
        'Failed to cherry-pick commit',
        async () => { await get().loadRepoStatus(); await get().loadCommitHistory(); await get().loadFileStatus(); },
      ),

      cherryPickAbort: async () => runGitOp(get, set,
        (rp) => gitService.cherryPickAbort(rp),
        'Failed to abort cherry-pick',
        async () => { await get().loadRepoStatus(); await get().loadFileStatus(); },
      ),

      // Branch rename
      renameBranch: async (oldName, newName, force) => runGitOp(get, set,
        (rp) => gitService.renameBranch(rp, oldName, newName, force),
        'Failed to rename branch',
        async () => { await get().loadBranches(); await get().loadRepoStatus(); },
      ),

      // Show commit detail
      showCommit: async (commitHash, maxLines) => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return null;
        try {
          const result = await gitService.showCommit(currentRepoPath, commitHash, maxLines);
          return (result.success && result.data) ? result.data : null;
        } catch {
          return null;
        }
      },

      // Merge abort
      mergeAbort: async () => runGitOp(get, set,
        (rp) => gitService.mergeAbort(rp),
        'Failed to abort merge',
        async () => { await get().loadRepoStatus(); await get().loadFileStatus(); },
      ),

      // Project Git configuration
      getProjectConfig: (projectId) => {
        const { projectConfigs } = get();
        return (
          projectConfigs[projectId] || {
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
          }
        );
      },

      setProjectConfig: (projectId, config) => {
        const { projectConfigs, getProjectConfig } = get();
        const currentConfig = getProjectConfig(projectId);
        set({
          projectConfigs: {
            ...projectConfigs,
            [projectId]: { ...currentConfig, ...config },
          },
        });
      },

      enableGitForProject: async (projectId, repoPath) => {
        const { setProjectConfig, initRepo } = get();

        // Check if repo exists, if not initialize it
        const isRepo = await gitService.isRepo(repoPath);
        if (!isRepo) {
          const success = await initRepo(repoPath);
          if (!success) return false;
        }

        setProjectConfig(projectId, {
          enabled: true,
          repoPath,
        });

        get().addTrackedRepo(repoPath);
        return true;
      },

      disableGitForProject: (projectId) => {
        const { setProjectConfig, getProjectConfig, removeTrackedRepo } = get();
        const config = getProjectConfig(projectId);
        if (config.repoPath) {
          removeTrackedRepo(config.repoPath);
        }
        setProjectConfig(projectId, {
          enabled: false,
          repoPath: null,
        });
      },

      // Auto-commit
      setAutoCommitConfig: (config) => {
        const { autoCommitConfig } = get();
        set({
          autoCommitConfig: { ...autoCommitConfig, ...config },
        });
      },

      triggerAutoCommit: async (projectId, trigger) => {
        const { getProjectConfig, autoCommitConfig } = get();
        const projectConfig = getProjectConfig(projectId);

        if (!projectConfig.enabled || !projectConfig.repoPath) {
          return false;
        }

        if (!autoCommitConfig.enabled) {
          return false;
        }

        try {
          const result = await gitService.autoCommit(
            projectConfig.repoPath,
            `Auto-commit (${trigger})`,
            projectId
          );
          return result.success;
        } catch {
          return false;
        }
      },

      // Graph
      loadGraphCommits: async (maxCount) => loadGitData(get, set,
        (rp) => gitService.getLogGraph(rp, maxCount),
        (data) => ({ graphCommits: data }),
      ),

      // Stats
      loadRepoStats: async () => loadGitData(get, set,
        (rp) => gitService.getRepoStats(rp),
        (data) => ({ repoStats: data }),
      ),

      // Checkpoints
      createCheckpoint: async (message) => runGitOp(get, set,
        (rp) => gitService.checkpointCreate(rp, message),
        'Failed to create checkpoint',
        () => get().loadCheckpoints(),
      ),

      loadCheckpoints: async () => loadGitData(get, set,
        (rp) => gitService.checkpointList(rp),
        (data) => ({ checkpoints: data }),
      ),

      restoreCheckpoint: async (id) => runGitOp(get, set,
        (rp) => gitService.checkpointRestore(rp, id),
        'Failed to restore checkpoint',
        async () => { await get().loadRepoStatus(); await get().loadFileStatus(); },
      ),

      deleteCheckpoint: async (id) => runGitOp(get, set,
        (rp) => gitService.checkpointDelete(rp, id),
        'Failed to delete checkpoint',
        () => get().loadCheckpoints(),
      ),

      // Repository tracking
      addTrackedRepo: (path) => {
        const { trackedRepos } = get();
        if (!trackedRepos.includes(path)) {
          set({ trackedRepos: [...trackedRepos, path] });
        }
      },

      removeTrackedRepo: (path) => {
        const { trackedRepos } = get();
        set({ trackedRepos: trackedRepos.filter((p) => p !== path) });
      },

      // State management
      setOperationStatus: (status) => set({ operationStatus: status }),
      setError: (error) => set({ lastError: error }),
      clearError: () => set({ lastError: null }),
      reset: () => set(initialState),
    }),
    {
      name: 'cognia-git',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        projectConfigs: state.projectConfigs,
        autoCommitConfig: state.autoCommitConfig,
        trackedRepos: state.trackedRepos,
      }),
    }
  )
);

// ==================== Selectors ====================

/** Select the full Git installation status object */
export const selectGitStatus = (state: GitState & GitActions) => state.gitStatus;
/** Select whether Git is installed */
export const selectIsGitInstalled = (state: GitState & GitActions) => state.gitStatus.installed;
/** Select the current repository info (used by agent-trace and sync stores) */
export const selectCurrentRepo = (state: GitState & GitActions) => state.currentRepoInfo;
/** Select the list of branches */
export const selectBranches = (state: GitState & GitActions) => state.branches;
/** Select the commit history */
export const selectCommits = (state: GitState & GitActions) => state.commits;
/** Select the file status list */
export const selectFileStatus = (state: GitState & GitActions) => state.fileStatus;
/** Select the list of remotes */
export const selectRemotes = (state: GitState & GitActions) => state.remotes;
/** Select the list of tags */
export const selectTags = (state: GitState & GitActions) => state.tags;
/** Select the current operation status */
export const selectOperationStatus = (state: GitState & GitActions) => state.operationStatus;
/** Select the last error message */
export const selectLastError = (state: GitState & GitActions) => state.lastError;
