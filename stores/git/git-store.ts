/**
 * Git Store - manages Git state with persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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

  // Project Git configuration
  getProjectConfig: (projectId: string) => ProjectGitConfig;
  setProjectConfig: (projectId: string, config: Partial<ProjectGitConfig>) => void;
  enableGitForProject: (projectId: string, repoPath: string) => Promise<boolean>;
  disableGitForProject: (projectId: string) => void;

  // Auto-commit
  setAutoCommitConfig: (config: Partial<AutoCommitConfig>) => void;
  triggerAutoCommit: (projectId: string, trigger: string) => Promise<boolean>;

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
  operationStatus: 'idle',
  operationProgress: null,
  lastError: null,
  projectConfigs: {},
  autoCommitConfig: initialAutoCommitConfig,
  trackedRepos: [],
};

export const useGitStore = create<GitState & GitActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Git installation
      checkGitInstalled: async () => {
        set({ isCheckingGit: true });
        try {
          const status = await gitService.checkInstalled();
          set({
            gitStatus: status,
            isCheckingGit: false,
          });
        } catch (error) {
          set({
            gitStatus: {
              ...initialGitStatus,
              status: 'error',
              error: error instanceof Error ? error.message : String(error),
              lastChecked: new Date().toISOString(),
            },
            isCheckingGit: false,
          });
        }
      },

      installGit: async () => {
        set({ isInstallingGit: true, installProgress: null });
        try {
          const status = await gitService.install();
          set({
            gitStatus: status,
            isInstallingGit: false,
            installProgress: null,
          });
        } catch (error) {
          set({
            isInstallingGit: false,
            lastError: error instanceof Error ? error.message : String(error),
          });
        }
      },

      // Git configuration
      loadGitConfig: async () => {
        try {
          const config = await gitService.getConfig();
          set({ gitConfig: config });
        } catch (error) {
          set({ lastError: error instanceof Error ? error.message : String(error) });
        }
      },

      updateGitConfig: async (config) => {
        try {
          await gitService.setConfig(config);
          const { gitConfig } = get();
          set({ gitConfig: { ...gitConfig, ...config } as GitConfig });
        } catch (error) {
          set({ lastError: error instanceof Error ? error.message : String(error) });
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
            set({
              currentRepoInfo: result.data,
              operationStatus: 'idle',
            });
          } else {
            set({
              lastError: result.error || 'Failed to get repository status',
              operationStatus: 'error',
            });
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
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
              operationStatus: 'idle',
            });
          } else {
            set({
              lastError: result.error || 'Failed to get full repository status',
              operationStatus: 'error',
            });
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
        }
      },

      initRepo: async (path, options) => {
        set({ operationStatus: 'running' });
        try {
          const result = await gitService.init({
            path,
            initialBranch: options?.initialBranch || 'main',
          });
          if (result.success) {
            set({
              currentRepoPath: path,
              currentRepoInfo: result.data || null,
              operationStatus: 'success',
            });
            get().addTrackedRepo(path);
            return true;
          } else {
            set({
              lastError: result.error || 'Failed to initialize repository',
              operationStatus: 'error',
            });
            return false;
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
          return false;
        }
      },

      cloneRepo: async (url, targetPath, options) => {
        set({ operationStatus: 'running' });
        try {
          const result = await gitService.clone({
            url,
            targetPath,
            branch: options?.branch,
            depth: options?.depth,
          });
          if (result.success) {
            set({
              currentRepoPath: targetPath,
              currentRepoInfo: result.data || null,
              operationStatus: 'success',
            });
            get().addTrackedRepo(targetPath);
            return true;
          } else {
            set({
              lastError: result.error || 'Failed to clone repository',
              operationStatus: 'error',
            });
            return false;
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
          return false;
        }
      },

      // Staging
      stageFiles: async (files) => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return false;

        set({ operationStatus: 'running' });
        try {
          const result = await gitService.stage(currentRepoPath, files);
          if (result.success) {
            await get().loadFileStatus();
            set({ operationStatus: 'success' });
            return true;
          } else {
            set({
              lastError: result.error || 'Failed to stage files',
              operationStatus: 'error',
            });
            return false;
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
          return false;
        }
      },

      stageAll: async () => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return false;

        set({ operationStatus: 'running' });
        try {
          const result = await gitService.stageAll(currentRepoPath);
          if (result.success) {
            await get().loadFileStatus();
            set({ operationStatus: 'success' });
            return true;
          } else {
            set({
              lastError: result.error || 'Failed to stage all files',
              operationStatus: 'error',
            });
            return false;
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
          return false;
        }
      },

      unstageFiles: async (files) => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return false;

        set({ operationStatus: 'running' });
        try {
          const result = await gitService.unstage(currentRepoPath, files);
          if (result.success) {
            await get().loadFileStatus();
            set({ operationStatus: 'success' });
            return true;
          } else {
            set({
              lastError: result.error || 'Failed to unstage files',
              operationStatus: 'error',
            });
            return false;
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
          return false;
        }
      },

      // Commits
      commit: async (message, options) => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return false;

        set({ operationStatus: 'running' });
        try {
          const result = await gitService.commit({
            repoPath: currentRepoPath,
            message,
            description: options?.description,
            amend: options?.amend,
          });
          if (result.success) {
            await get().loadRepoStatus();
            await get().loadCommitHistory();
            set({ operationStatus: 'success' });
            return true;
          } else {
            set({
              lastError: result.error || 'Failed to commit',
              operationStatus: 'error',
            });
            return false;
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
          return false;
        }
      },

      loadCommitHistory: async (options) => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return;

        try {
          const result = await gitService.getLog({
            repoPath: currentRepoPath,
            maxCount: options?.maxCount || 50,
          });
          if (result.success && result.data) {
            set({ commits: result.data });
          }
        } catch (error) {
          set({ lastError: error instanceof Error ? error.message : String(error) });
        }
      },

      // Branches
      loadBranches: async () => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return;

        try {
          const result = await gitService.getBranches(currentRepoPath, true);
          if (result.success && result.data) {
            set({ branches: result.data });
          }
        } catch (error) {
          set({ lastError: error instanceof Error ? error.message : String(error) });
        }
      },

      createBranch: async (name, startPoint) => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return false;

        set({ operationStatus: 'running' });
        try {
          const result = await gitService.createBranch({
            repoPath: currentRepoPath,
            name,
            startPoint,
          });
          if (result.success) {
            await get().loadBranches();
            set({ operationStatus: 'success' });
            return true;
          } else {
            set({
              lastError: result.error || 'Failed to create branch',
              operationStatus: 'error',
            });
            return false;
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
          return false;
        }
      },

      deleteBranch: async (name, force) => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return false;

        set({ operationStatus: 'running' });
        try {
          const result = await gitService.deleteBranch({
            repoPath: currentRepoPath,
            name,
            force,
          });
          if (result.success) {
            await get().loadBranches();
            set({ operationStatus: 'success' });
            return true;
          } else {
            set({
              lastError: result.error || 'Failed to delete branch',
              operationStatus: 'error',
            });
            return false;
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
          return false;
        }
      },

      checkout: async (target, createBranch) => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return false;

        set({ operationStatus: 'running' });
        try {
          const result = await gitService.checkout({
            repoPath: currentRepoPath,
            target,
            createBranch,
          });
          if (result.success) {
            await get().loadRepoStatus();
            await get().loadBranches();
            set({ operationStatus: 'success' });
            return true;
          } else {
            set({
              lastError: result.error || 'Failed to checkout',
              operationStatus: 'error',
            });
            return false;
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
          return false;
        }
      },

      mergeBranch: async (branch, options) => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return false;

        set({ operationStatus: 'running' });
        try {
          const result = await gitService.merge({
            repoPath: currentRepoPath,
            branch,
            noFf: options?.noFf,
            squash: options?.squash,
          });
          if (result.success) {
            await get().loadRepoStatus();
            await get().loadBranches();
            await get().loadCommitHistory();
            set({ operationStatus: 'success' });
            return true;
          } else {
            set({
              lastError: result.error || 'Failed to merge branch',
              operationStatus: 'error',
            });
            return false;
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
          return false;
        }
      },

      getDiffBetween: async (fromRef, toRef) => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return null;

        try {
          const result = await gitService.getDiffBetween(currentRepoPath, fromRef, toRef);
          if (result.success && result.data) {
            return result.data;
          }
          return null;
        } catch (error) {
          console.error('Failed to get diff between refs:', error);
          return null;
        }
      },

      // Remote operations
      push: async (options) => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return false;

        set({ operationStatus: 'running' });
        try {
          const result = await gitService.push({
            repoPath: currentRepoPath,
            force: options?.force,
            setUpstream: options?.setUpstream,
          });
          if (result.success) {
            await get().loadRepoStatus();
            set({ operationStatus: 'success' });
            return true;
          } else {
            set({
              lastError: result.error || 'Failed to push',
              operationStatus: 'error',
            });
            return false;
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
          return false;
        }
      },

      pull: async (options) => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return false;

        set({ operationStatus: 'running' });
        try {
          const result = await gitService.pull({
            repoPath: currentRepoPath,
            rebase: options?.rebase,
          });
          if (result.success) {
            await get().loadRepoStatus();
            await get().loadCommitHistory();
            set({ operationStatus: 'success' });
            return true;
          } else {
            set({
              lastError: result.error || 'Failed to pull',
              operationStatus: 'error',
            });
            return false;
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
          return false;
        }
      },

      fetch: async () => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return false;

        set({ operationStatus: 'running' });
        try {
          const result = await gitService.fetch(currentRepoPath);
          if (result.success) {
            await get().loadRepoStatus();
            set({ operationStatus: 'success' });
            return true;
          } else {
            set({
              lastError: result.error || 'Failed to fetch',
              operationStatus: 'error',
            });
            return false;
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
          return false;
        }
      },

      // File operations
      loadFileStatus: async () => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return;

        try {
          const result = await gitService.getFileStatus(currentRepoPath);
          if (result.success && result.data) {
            set({ fileStatus: result.data });
          }
        } catch (error) {
          set({ lastError: error instanceof Error ? error.message : String(error) });
        }
      },

      discardChanges: async (files) => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return false;

        set({ operationStatus: 'running' });
        try {
          const result = await gitService.discardChanges(currentRepoPath, files);
          if (result.success) {
            await get().loadFileStatus();
            await get().loadRepoStatus();
            set({ operationStatus: 'success' });
            return true;
          } else {
            set({
              lastError: result.error || 'Failed to discard changes',
              operationStatus: 'error',
            });
            return false;
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
          return false;
        }
      },

      getDiffContent: async (filePath, staged) => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return null;

        try {
          const result = await gitService.getDiffFile(currentRepoPath, filePath, staged);
          if (result.success && result.data) {
            return result.data.content || null;
          }
          return null;
        } catch {
          return null;
        }
      },

      // Stash operations
      loadStashList: async () => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return;

        try {
          const result = await gitService.getStashList(currentRepoPath);
          if (result.success && result.data) {
            set({ stashList: result.data });
          }
        } catch (error) {
          set({ lastError: error instanceof Error ? error.message : String(error) });
        }
      },

      stashSave: async (message, includeUntracked) => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return false;

        set({ operationStatus: 'running' });
        try {
          const result = await gitService.stash({
            repoPath: currentRepoPath,
            action: 'save',
            message,
            includeUntracked,
          });
          if (result.success) {
            await get().loadStashList();
            await get().loadFileStatus();
            await get().loadRepoStatus();
            set({ operationStatus: 'success' });
            return true;
          } else {
            set({
              lastError: result.error || 'Failed to stash changes',
              operationStatus: 'error',
            });
            return false;
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
          return false;
        }
      },

      stashPop: async (index) => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return false;

        set({ operationStatus: 'running' });
        try {
          const result = await gitService.stash({
            repoPath: currentRepoPath,
            action: 'pop',
            stashIndex: index,
          });
          if (result.success) {
            await get().loadStashList();
            await get().loadFileStatus();
            await get().loadRepoStatus();
            set({ operationStatus: 'success' });
            return true;
          } else {
            set({
              lastError: result.error || 'Failed to pop stash',
              operationStatus: 'error',
            });
            return false;
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
          return false;
        }
      },

      stashApply: async (index) => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return false;

        set({ operationStatus: 'running' });
        try {
          const result = await gitService.stash({
            repoPath: currentRepoPath,
            action: 'apply',
            stashIndex: index,
          });
          if (result.success) {
            await get().loadFileStatus();
            await get().loadRepoStatus();
            set({ operationStatus: 'success' });
            return true;
          } else {
            set({
              lastError: result.error || 'Failed to apply stash',
              operationStatus: 'error',
            });
            return false;
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
          return false;
        }
      },

      stashDrop: async (index) => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return false;

        set({ operationStatus: 'running' });
        try {
          const result = await gitService.stash({
            repoPath: currentRepoPath,
            action: 'drop',
            stashIndex: index,
          });
          if (result.success) {
            await get().loadStashList();
            set({ operationStatus: 'success' });
            return true;
          } else {
            set({
              lastError: result.error || 'Failed to drop stash',
              operationStatus: 'error',
            });
            return false;
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
          return false;
        }
      },

      stashClear: async () => {
        const { currentRepoPath } = get();
        if (!currentRepoPath) return false;

        set({ operationStatus: 'running' });
        try {
          const result = await gitService.stash({
            repoPath: currentRepoPath,
            action: 'clear',
          });
          if (result.success) {
            set({ stashList: [], operationStatus: 'success' });
            return true;
          } else {
            set({
              lastError: result.error || 'Failed to clear stash',
              operationStatus: 'error',
            });
            return false;
          }
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : String(error),
            operationStatus: 'error',
          });
          return false;
        }
      },

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

// Selectors
export const selectGitStatus = (state: GitState & GitActions) => state.gitStatus;
export const selectIsGitInstalled = (state: GitState & GitActions) => state.gitStatus.installed;
export const selectCurrentRepo = (state: GitState & GitActions) => state.currentRepoInfo;
export const selectBranches = (state: GitState & GitActions) => state.branches;
export const selectCommits = (state: GitState & GitActions) => state.commits;
export const selectFileStatus = (state: GitState & GitActions) => state.fileStatus;
export const selectOperationStatus = (state: GitState & GitActions) => state.operationStatus;
export const selectLastError = (state: GitState & GitActions) => state.lastError;
