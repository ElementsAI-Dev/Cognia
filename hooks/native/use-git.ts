/**
 * useGit Hook - React hook for Git operations
 *
 * Provides convenient access to Git functionality with automatic
 * status checking, installation detection, and repository management.
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGitStore } from '@/stores/git';
import { gitService } from '@/lib/native/git';
import type {
  GitStatus,
  GitRepoInfo,
  GitCommitInfo,
  GitBranchInfo,
  GitFileStatus,
  GitRemoteInfo,
  GitTagInfo,
  GitCommitDetail,
  GitOperationProgress,
  GitOperationStatus,
  ProjectGitConfig,
} from '@/types/system/git';

export interface UseGitOptions {
  autoCheck?: boolean;
  autoLoadStatus?: boolean;
  repoPath?: string;
  projectId?: string;
}

export interface UseGitReturn {
  // Desktop availability
  isDesktopAvailable: boolean;

  // Installation status
  gitStatus: GitStatus;
  isInstalled: boolean;
  isCheckingGit: boolean;
  isInstallingGit: boolean;
  installProgress: GitOperationProgress | null;

  // Repository info
  currentRepo: GitRepoInfo | null;
  branches: GitBranchInfo[];
  commits: GitCommitInfo[];
  fileStatus: GitFileStatus[];
  stashList: { index: number; message: string; branch?: string; date?: string }[];
  remotes: GitRemoteInfo[];
  tags: GitTagInfo[];

  // Operation state
  operationStatus: GitOperationStatus;
  isOperating: boolean;
  error: string | null;

  // Project config
  projectConfig: ProjectGitConfig | null;

  // Installation actions
  checkGitInstalled: () => Promise<void>;
  installGit: () => Promise<void>;
  openGitWebsite: () => Promise<void>;

  // Repository actions
  initRepo: (path: string, options?: { initialBranch?: string }) => Promise<boolean>;
  cloneRepo: (
    url: string,
    targetPath: string,
    options?: { branch?: string; depth?: number }
  ) => Promise<boolean>;
  setCurrentRepo: (path: string | null) => void;
  refreshStatus: () => Promise<void>;

  // Staging actions
  stage: (files: string[]) => Promise<boolean>;
  stageAll: () => Promise<boolean>;
  unstage: (files: string[]) => Promise<boolean>;

  // Commit actions
  commit: (
    message: string,
    options?: { description?: string; amend?: boolean }
  ) => Promise<boolean>;

  // Branch actions
  createBranch: (name: string, startPoint?: string) => Promise<boolean>;
  deleteBranch: (name: string, force?: boolean) => Promise<boolean>;
  checkout: (target: string, createBranch?: boolean) => Promise<boolean>;
  mergeBranch: (branch: string, options?: { noFf?: boolean; squash?: boolean }) => Promise<boolean>;

  // Diff actions
  getDiffBetween: (fromRef: string, toRef: string) => Promise<import('@/types/system/git').GitDiffInfo[] | null>;

  // Remote actions
  push: (options?: { force?: boolean; setUpstream?: boolean }) => Promise<boolean>;
  pull: (options?: { rebase?: boolean }) => Promise<boolean>;
  fetch: () => Promise<boolean>;

  // File actions
  discardChanges: (files: string[]) => Promise<boolean>;
  getDiffContent: (filePath: string, staged?: boolean) => Promise<string | null>;

  // Stash actions
  stashSave: (message?: string, includeUntracked?: boolean) => Promise<boolean>;
  stashPop: (index?: number) => Promise<boolean>;
  stashApply: (index?: number) => Promise<boolean>;
  stashDrop: (index?: number) => Promise<boolean>;
  stashClear: () => Promise<boolean>;

  // Remote management
  loadRemotes: () => Promise<void>;
  addRemote: (name: string, url: string) => Promise<boolean>;
  removeRemote: (name: string) => Promise<boolean>;

  // Tag actions
  loadTags: () => Promise<void>;
  createTag: (name: string, options?: { message?: string; target?: string; force?: boolean }) => Promise<boolean>;
  deleteTag: (name: string) => Promise<boolean>;
  pushTag: (name: string, remote?: string) => Promise<boolean>;

  // Revert actions
  revertCommit: (commitHash: string, noCommit?: boolean) => Promise<boolean>;
  revertAbort: () => Promise<boolean>;

  // Cherry-pick actions
  cherryPick: (commitHash: string, noCommit?: boolean) => Promise<boolean>;
  cherryPickAbort: () => Promise<boolean>;

  // Branch rename
  renameBranch: (oldName: string, newName: string, force?: boolean) => Promise<boolean>;

  // Commit detail
  showCommit: (commitHash: string, maxLines?: number) => Promise<GitCommitDetail | null>;

  // Merge abort
  mergeAbort: () => Promise<boolean>;

  // Project Git
  enableGitForProject: (repoPath: string) => Promise<boolean>;
  disableGitForProject: () => void;
  updateProjectConfig: (config: Partial<ProjectGitConfig>) => void;

  // Error handling
  clearError: () => void;
}

export function useGit(options: UseGitOptions = {}): UseGitReturn {
  const { autoCheck = true, autoLoadStatus = true, repoPath, projectId } = options;

  const initialCheckDone = useRef(false);
  const [isAvailable] = useState(() => gitService.isAvailable());

  // Store state - using useShallow for optimized subscriptions
  const {
    gitStatus,
    isCheckingGit,
    isInstallingGit,
    installProgress,
    currentRepoInfo,
    branches,
    commits,
    fileStatus,
    stashList,
    remotes,
    tags,
    operationStatus,
    lastError,
  } = useGitStore(
    useShallow((state) => ({
      gitStatus: state.gitStatus,
      isCheckingGit: state.isCheckingGit,
      isInstallingGit: state.isInstallingGit,
      installProgress: state.installProgress,
      currentRepoInfo: state.currentRepoInfo,
      branches: state.branches,
      commits: state.commits,
      fileStatus: state.fileStatus,
      stashList: state.stashList,
      remotes: state.remotes,
      tags: state.tags,
      operationStatus: state.operationStatus,
      lastError: state.lastError,
    }))
  );

  // Store actions - using useShallow for stable references
  const {
    checkGitInstalled,
    installGit: installGitAction,
    setCurrentRepo,
    loadRepoStatus,
    loadBranches,
    loadCommitHistory,
    loadFileStatus,
    loadStashList,
    initRepo: initRepoAction,
    cloneRepo: cloneRepoAction,
    stageFiles: stageFilesAction,
    stageAll: stageAllAction,
    unstageFiles: unstageFilesAction,
    commit: commitAction,
    createBranch: createBranchAction,
    deleteBranch: deleteBranchAction,
    checkout: checkoutAction,
    push: pushAction,
    pull: pullAction,
    fetch: fetchAction,
    discardChanges: discardChangesAction,
    getDiffContent: getDiffContentAction,
    stashSave: stashSaveAction,
    stashPop: stashPopAction,
    stashApply: stashApplyAction,
    stashDrop: stashDropAction,
    stashClear: stashClearAction,
    mergeBranch: mergeBranchAction,
    getDiffBetween: getDiffBetweenAction,
    getProjectConfig,
    setProjectConfig,
    enableGitForProject: enableGitForProjectAction,
    disableGitForProject: disableGitForProjectAction,
    clearError,
    loadRemotes: loadRemotesAction,
    addRemote: addRemoteAction,
    removeRemote: removeRemoteAction,
    loadTags: loadTagsAction,
    createTag: createTagAction,
    deleteTag: deleteTagAction,
    pushTag: pushTagAction,
    revertCommit: revertCommitAction,
    revertAbort: revertAbortAction,
    cherryPick: cherryPickAction,
    cherryPickAbort: cherryPickAbortAction,
    renameBranch: renameBranchAction,
    showCommit: showCommitAction,
    mergeAbort: mergeAbortAction,
  } = useGitStore(
    useShallow((state) => ({
      checkGitInstalled: state.checkGitInstalled,
      installGit: state.installGit,
      setCurrentRepo: state.setCurrentRepo,
      loadRepoStatus: state.loadRepoStatus,
      loadBranches: state.loadBranches,
      loadCommitHistory: state.loadCommitHistory,
      loadFileStatus: state.loadFileStatus,
      loadStashList: state.loadStashList,
      initRepo: state.initRepo,
      cloneRepo: state.cloneRepo,
      stageFiles: state.stageFiles,
      stageAll: state.stageAll,
      unstageFiles: state.unstageFiles,
      commit: state.commit,
      createBranch: state.createBranch,
      deleteBranch: state.deleteBranch,
      checkout: state.checkout,
      mergeBranch: state.mergeBranch,
      getDiffBetween: state.getDiffBetween,
      push: state.push,
      pull: state.pull,
      fetch: state.fetch,
      discardChanges: state.discardChanges,
      getDiffContent: state.getDiffContent,
      stashSave: state.stashSave,
      stashPop: state.stashPop,
      stashApply: state.stashApply,
      stashDrop: state.stashDrop,
      stashClear: state.stashClear,
      getProjectConfig: state.getProjectConfig,
      setProjectConfig: state.setProjectConfig,
      enableGitForProject: state.enableGitForProject,
      disableGitForProject: state.disableGitForProject,
      clearError: state.clearError,
      loadRemotes: state.loadRemotes,
      addRemote: state.addRemote,
      removeRemote: state.removeRemote,
      loadTags: state.loadTags,
      createTag: state.createTag,
      deleteTag: state.deleteTag,
      pushTag: state.pushTag,
      revertCommit: state.revertCommit,
      revertAbort: state.revertAbort,
      cherryPick: state.cherryPick,
      cherryPickAbort: state.cherryPickAbort,
      renameBranch: state.renameBranch,
      showCommit: state.showCommit,
      mergeAbort: state.mergeAbort,
    }))
  );

  // Get project config if projectId provided
  const projectConfig = projectId ? getProjectConfig(projectId) : null;

  // Auto-check Git installation on mount
  useEffect(() => {
    if (autoCheck && isAvailable && !initialCheckDone.current) {
      initialCheckDone.current = true;
      checkGitInstalled();
    }
  }, [autoCheck, isAvailable, checkGitInstalled]);

  // Set current repo if provided
  useEffect(() => {
    if (repoPath) {
      setCurrentRepo(repoPath);
    }
  }, [repoPath, setCurrentRepo]);

  // Auto-load status when repo changes
  useEffect(() => {
    if (autoLoadStatus && currentRepoInfo?.isGitRepo) {
      loadBranches();
      loadCommitHistory();
      loadFileStatus();
      loadStashList();
      loadRemotesAction();
      loadTagsAction();
    }
  }, [
    autoLoadStatus,
    currentRepoInfo?.isGitRepo,
    loadBranches,
    loadCommitHistory,
    loadFileStatus,
    loadStashList,
    loadRemotesAction,
    loadTagsAction,
  ]);

  // Refresh all status
  const refreshStatus = useCallback(async () => {
    await loadRepoStatus();
    await loadBranches();
    await loadCommitHistory();
    await loadFileStatus();
    await loadStashList();
    await loadRemotesAction();
    await loadTagsAction();
  }, [loadRepoStatus, loadBranches, loadCommitHistory, loadFileStatus, loadStashList, loadRemotesAction, loadTagsAction]);

  // Install Git
  const installGit = useCallback(async () => {
    if (!isAvailable) {
      gitService.openWebsite();
      return;
    }
    await installGitAction();
  }, [isAvailable, installGitAction]);

  // Open Git website
  const openGitWebsite = useCallback(async () => {
    await gitService.openWebsite();
  }, []);

  // Init repo
  const initRepo = useCallback(
    async (path: string, options?: { initialBranch?: string }) => {
      const success = await initRepoAction(path, options);
      if (success) {
        await refreshStatus();
      }
      return success;
    },
    [initRepoAction, refreshStatus]
  );

  // Clone repo
  const cloneRepo = useCallback(
    async (url: string, targetPath: string, options?: { branch?: string; depth?: number }) => {
      const success = await cloneRepoAction(url, targetPath, options);
      if (success) {
        await refreshStatus();
      }
      return success;
    },
    [cloneRepoAction, refreshStatus]
  );

  // Stage files
  const stage = useCallback(
    async (files: string[]) => {
      return stageFilesAction(files);
    },
    [stageFilesAction]
  );

  // Stage all
  const stageAll = useCallback(async () => {
    return stageAllAction();
  }, [stageAllAction]);

  // Unstage files
  const unstage = useCallback(
    async (files: string[]) => {
      return unstageFilesAction(files);
    },
    [unstageFilesAction]
  );

  // Commit
  const commit = useCallback(
    async (message: string, options?: { description?: string; amend?: boolean }) => {
      return commitAction(message, options);
    },
    [commitAction]
  );

  // Create branch
  const createBranch = useCallback(
    async (name: string, startPoint?: string) => {
      return createBranchAction(name, startPoint);
    },
    [createBranchAction]
  );

  // Delete branch
  const deleteBranch = useCallback(
    async (name: string, force?: boolean) => {
      return deleteBranchAction(name, force);
    },
    [deleteBranchAction]
  );

  // Checkout
  const checkout = useCallback(
    async (target: string, createBranch?: boolean) => {
      return checkoutAction(target, createBranch);
    },
    [checkoutAction]
  );

  // Merge branch
  const mergeBranch = useCallback(
    async (branch: string, options?: { noFf?: boolean; squash?: boolean }) => {
      return mergeBranchAction(branch, options);
    },
    [mergeBranchAction]
  );

  // Get diff between commits
  const getDiffBetween = useCallback(
    async (fromRef: string, toRef: string) => {
      return getDiffBetweenAction(fromRef, toRef);
    },
    [getDiffBetweenAction]
  );

  // Push
  const push = useCallback(
    async (options?: { force?: boolean; setUpstream?: boolean }) => {
      return pushAction(options);
    },
    [pushAction]
  );

  // Pull
  const pull = useCallback(
    async (options?: { rebase?: boolean }) => {
      return pullAction(options);
    },
    [pullAction]
  );

  // Fetch
  const fetch = useCallback(async () => {
    return fetchAction();
  }, [fetchAction]);

  // Discard changes
  const discardChanges = useCallback(
    async (files: string[]) => {
      return discardChangesAction(files);
    },
    [discardChangesAction]
  );

  // Get diff content for a file
  const getDiffContent = useCallback(
    async (filePath: string, staged?: boolean) => {
      return getDiffContentAction(filePath, staged);
    },
    [getDiffContentAction]
  );

  // Stash save
  const stashSave = useCallback(
    async (message?: string, includeUntracked?: boolean) => {
      return stashSaveAction(message, includeUntracked);
    },
    [stashSaveAction]
  );

  // Stash pop
  const stashPop = useCallback(
    async (index?: number) => {
      return stashPopAction(index);
    },
    [stashPopAction]
  );

  // Stash apply
  const stashApply = useCallback(
    async (index?: number) => {
      return stashApplyAction(index);
    },
    [stashApplyAction]
  );

  // Stash drop
  const stashDrop = useCallback(
    async (index?: number) => {
      return stashDropAction(index);
    },
    [stashDropAction]
  );

  // Stash clear
  const stashClear = useCallback(async () => {
    return stashClearAction();
  }, [stashClearAction]);

  // Remote management
  const loadRemotes = useCallback(async () => {
    return loadRemotesAction();
  }, [loadRemotesAction]);

  const addRemote = useCallback(
    async (name: string, url: string) => {
      return addRemoteAction(name, url);
    },
    [addRemoteAction]
  );

  const removeRemote = useCallback(
    async (name: string) => {
      return removeRemoteAction(name);
    },
    [removeRemoteAction]
  );

  // Tag actions
  const loadTags = useCallback(async () => {
    return loadTagsAction();
  }, [loadTagsAction]);

  const createTag = useCallback(
    async (name: string, options?: { message?: string; target?: string; force?: boolean }) => {
      return createTagAction(name, options);
    },
    [createTagAction]
  );

  const deleteTag = useCallback(
    async (name: string) => {
      return deleteTagAction(name);
    },
    [deleteTagAction]
  );

  const pushTag = useCallback(
    async (name: string, remote?: string) => {
      return pushTagAction(name, remote);
    },
    [pushTagAction]
  );

  // Revert actions
  const revertCommit = useCallback(
    async (commitHash: string, noCommit?: boolean) => {
      return revertCommitAction(commitHash, noCommit);
    },
    [revertCommitAction]
  );

  const revertAbort = useCallback(async () => {
    return revertAbortAction();
  }, [revertAbortAction]);

  // Cherry-pick actions
  const cherryPick = useCallback(
    async (commitHash: string, noCommit?: boolean) => {
      return cherryPickAction(commitHash, noCommit);
    },
    [cherryPickAction]
  );

  const cherryPickAbort = useCallback(async () => {
    return cherryPickAbortAction();
  }, [cherryPickAbortAction]);

  // Branch rename
  const renameBranch = useCallback(
    async (oldName: string, newName: string, force?: boolean) => {
      return renameBranchAction(oldName, newName, force);
    },
    [renameBranchAction]
  );

  // Show commit detail
  const showCommit = useCallback(
    async (commitHash: string, maxLines?: number) => {
      return showCommitAction(commitHash, maxLines);
    },
    [showCommitAction]
  );

  // Merge abort
  const mergeAbort = useCallback(async () => {
    return mergeAbortAction();
  }, [mergeAbortAction]);

  // Enable Git for project
  const enableGitForProject = useCallback(
    async (gitRepoPath: string) => {
      if (!projectId) return false;
      return enableGitForProjectAction(projectId, gitRepoPath);
    },
    [projectId, enableGitForProjectAction]
  );

  // Disable Git for project
  const disableGitForProject = useCallback(() => {
    if (!projectId) return;
    disableGitForProjectAction(projectId);
  }, [projectId, disableGitForProjectAction]);

  // Update project config
  const updateProjectConfig = useCallback(
    (config: Partial<ProjectGitConfig>) => {
      if (!projectId) return;
      setProjectConfig(projectId, config);
    },
    [projectId, setProjectConfig]
  );

  return {
    // Desktop availability
    isDesktopAvailable: isAvailable,

    // Installation status
    gitStatus,
    isInstalled: gitStatus.installed,
    isCheckingGit,
    isInstallingGit,
    installProgress,

    // Repository info
    currentRepo: currentRepoInfo,
    branches,
    commits,
    fileStatus,
    stashList,
    remotes,
    tags,

    // Operation state
    operationStatus,
    isOperating: operationStatus === 'running' || operationStatus === 'pending',
    error: lastError,

    // Project config
    projectConfig,

    // Installation actions
    checkGitInstalled,
    installGit,
    openGitWebsite,

    // Repository actions
    initRepo,
    cloneRepo,
    setCurrentRepo,
    refreshStatus,

    // Staging actions
    stage,
    stageAll,
    unstage,

    // Commit actions
    commit,

    // Branch actions
    createBranch,
    deleteBranch,
    checkout,
    mergeBranch,

    // Diff actions
    getDiffBetween,

    // Remote actions
    push,
    pull,
    fetch,

    // File actions
    discardChanges,
    getDiffContent,

    // Stash actions
    stashSave,
    stashPop,
    stashApply,
    stashDrop,
    stashClear,

    // Remote management
    loadRemotes,
    addRemote,
    removeRemote,

    // Tag actions
    loadTags,
    createTag,
    deleteTag,
    pushTag,

    // Revert actions
    revertCommit,
    revertAbort,

    // Cherry-pick actions
    cherryPick,
    cherryPickAbort,

    // Branch rename
    renameBranch,

    // Commit detail
    showCommit,

    // Merge abort
    mergeAbort,

    // Project Git
    enableGitForProject,
    disableGitForProject,
    updateProjectConfig,

    // Error handling
    clearError,
  };
}

export default useGit;
