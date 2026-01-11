/**
 * useGit Hook - React hook for Git operations
 *
 * Provides convenient access to Git functionality with automatic
 * status checking, installation detection, and repository management.
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { useGitStore } from '@/stores/git';
import { gitService } from '@/lib/native/git';
import type {
  GitStatus,
  GitRepoInfo,
  GitCommitInfo,
  GitBranchInfo,
  GitFileStatus,
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
  cloneRepo: (url: string, targetPath: string, options?: { branch?: string; depth?: number }) => Promise<boolean>;
  setCurrentRepo: (path: string | null) => void;
  refreshStatus: () => Promise<void>;
  
  // Staging actions
  stage: (files: string[]) => Promise<boolean>;
  stageAll: () => Promise<boolean>;
  unstage: (files: string[]) => Promise<boolean>;
  
  // Commit actions
  commit: (message: string, options?: { description?: string; amend?: boolean }) => Promise<boolean>;
  
  // Branch actions
  createBranch: (name: string, startPoint?: string) => Promise<boolean>;
  deleteBranch: (name: string, force?: boolean) => Promise<boolean>;
  checkout: (target: string, createBranch?: boolean) => Promise<boolean>;
  
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
  
  // Project Git
  enableGitForProject: (repoPath: string) => Promise<boolean>;
  disableGitForProject: () => void;
  updateProjectConfig: (config: Partial<ProjectGitConfig>) => void;
  
  // Error handling
  clearError: () => void;
}

export function useGit(options: UseGitOptions = {}): UseGitReturn {
  const {
    autoCheck = true,
    autoLoadStatus = true,
    repoPath,
    projectId,
  } = options;

  const initialCheckDone = useRef(false);
  const [isAvailable] = useState(() => gitService.isAvailable());

  // Store state
  const gitStatus = useGitStore((state) => state.gitStatus);
  const isCheckingGit = useGitStore((state) => state.isCheckingGit);
  const isInstallingGit = useGitStore((state) => state.isInstallingGit);
  const installProgress = useGitStore((state) => state.installProgress);
  const currentRepoInfo = useGitStore((state) => state.currentRepoInfo);
  const branches = useGitStore((state) => state.branches);
  const commits = useGitStore((state) => state.commits);
  const fileStatus = useGitStore((state) => state.fileStatus);
  const stashList = useGitStore((state) => state.stashList);
  const operationStatus = useGitStore((state) => state.operationStatus);
  const lastError = useGitStore((state) => state.lastError);

  // Store actions
  const checkGitInstalled = useGitStore((state) => state.checkGitInstalled);
  const installGitAction = useGitStore((state) => state.installGit);
  const setCurrentRepo = useGitStore((state) => state.setCurrentRepo);
  const loadRepoStatus = useGitStore((state) => state.loadRepoStatus);
  const loadBranches = useGitStore((state) => state.loadBranches);
  const loadCommitHistory = useGitStore((state) => state.loadCommitHistory);
  const loadFileStatus = useGitStore((state) => state.loadFileStatus);
  const loadStashList = useGitStore((state) => state.loadStashList);
  const initRepoAction = useGitStore((state) => state.initRepo);
  const cloneRepoAction = useGitStore((state) => state.cloneRepo);
  const stageFilesAction = useGitStore((state) => state.stageFiles);
  const stageAllAction = useGitStore((state) => state.stageAll);
  const unstageFilesAction = useGitStore((state) => state.unstageFiles);
  const commitAction = useGitStore((state) => state.commit);
  const createBranchAction = useGitStore((state) => state.createBranch);
  const deleteBranchAction = useGitStore((state) => state.deleteBranch);
  const checkoutAction = useGitStore((state) => state.checkout);
  const pushAction = useGitStore((state) => state.push);
  const pullAction = useGitStore((state) => state.pull);
  const fetchAction = useGitStore((state) => state.fetch);
  const discardChangesAction = useGitStore((state) => state.discardChanges);
  const getDiffContentAction = useGitStore((state) => state.getDiffContent);
  const stashSaveAction = useGitStore((state) => state.stashSave);
  const stashPopAction = useGitStore((state) => state.stashPop);
  const stashApplyAction = useGitStore((state) => state.stashApply);
  const stashDropAction = useGitStore((state) => state.stashDrop);
  const stashClearAction = useGitStore((state) => state.stashClear);
  const getProjectConfig = useGitStore((state) => state.getProjectConfig);
  const setProjectConfig = useGitStore((state) => state.setProjectConfig);
  const enableGitForProjectAction = useGitStore((state) => state.enableGitForProject);
  const disableGitForProjectAction = useGitStore((state) => state.disableGitForProject);
  const clearError = useGitStore((state) => state.clearError);

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
    }
  }, [autoLoadStatus, currentRepoInfo?.isGitRepo, loadBranches, loadCommitHistory, loadFileStatus, loadStashList]);

  // Refresh all status
  const refreshStatus = useCallback(async () => {
    await loadRepoStatus();
    await loadBranches();
    await loadCommitHistory();
    await loadFileStatus();
    await loadStashList();
  }, [loadRepoStatus, loadBranches, loadCommitHistory, loadFileStatus, loadStashList]);

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
  const initRepo = useCallback(async (path: string, options?: { initialBranch?: string }) => {
    const success = await initRepoAction(path, options);
    if (success) {
      await refreshStatus();
    }
    return success;
  }, [initRepoAction, refreshStatus]);

  // Clone repo
  const cloneRepo = useCallback(async (
    url: string,
    targetPath: string,
    options?: { branch?: string; depth?: number }
  ) => {
    const success = await cloneRepoAction(url, targetPath, options);
    if (success) {
      await refreshStatus();
    }
    return success;
  }, [cloneRepoAction, refreshStatus]);

  // Stage files
  const stage = useCallback(async (files: string[]) => {
    return stageFilesAction(files);
  }, [stageFilesAction]);

  // Stage all
  const stageAll = useCallback(async () => {
    return stageAllAction();
  }, [stageAllAction]);

  // Unstage files
  const unstage = useCallback(async (files: string[]) => {
    return unstageFilesAction(files);
  }, [unstageFilesAction]);

  // Commit
  const commit = useCallback(async (
    message: string,
    options?: { description?: string; amend?: boolean }
  ) => {
    return commitAction(message, options);
  }, [commitAction]);

  // Create branch
  const createBranch = useCallback(async (name: string, startPoint?: string) => {
    return createBranchAction(name, startPoint);
  }, [createBranchAction]);

  // Delete branch
  const deleteBranch = useCallback(async (name: string, force?: boolean) => {
    return deleteBranchAction(name, force);
  }, [deleteBranchAction]);

  // Checkout
  const checkout = useCallback(async (target: string, createBranch?: boolean) => {
    return checkoutAction(target, createBranch);
  }, [checkoutAction]);

  // Push
  const push = useCallback(async (options?: { force?: boolean; setUpstream?: boolean }) => {
    return pushAction(options);
  }, [pushAction]);

  // Pull
  const pull = useCallback(async (options?: { rebase?: boolean }) => {
    return pullAction(options);
  }, [pullAction]);

  // Fetch
  const fetch = useCallback(async () => {
    return fetchAction();
  }, [fetchAction]);

  // Discard changes
  const discardChanges = useCallback(async (files: string[]) => {
    return discardChangesAction(files);
  }, [discardChangesAction]);

  // Get diff content for a file
  const getDiffContent = useCallback(async (filePath: string, staged?: boolean) => {
    return getDiffContentAction(filePath, staged);
  }, [getDiffContentAction]);

  // Stash save
  const stashSave = useCallback(async (message?: string, includeUntracked?: boolean) => {
    return stashSaveAction(message, includeUntracked);
  }, [stashSaveAction]);

  // Stash pop
  const stashPop = useCallback(async (index?: number) => {
    return stashPopAction(index);
  }, [stashPopAction]);

  // Stash apply
  const stashApply = useCallback(async (index?: number) => {
    return stashApplyAction(index);
  }, [stashApplyAction]);

  // Stash drop
  const stashDrop = useCallback(async (index?: number) => {
    return stashDropAction(index);
  }, [stashDropAction]);

  // Stash clear
  const stashClear = useCallback(async () => {
    return stashClearAction();
  }, [stashClearAction]);

  // Enable Git for project
  const enableGitForProject = useCallback(async (gitRepoPath: string) => {
    if (!projectId) return false;
    return enableGitForProjectAction(projectId, gitRepoPath);
  }, [projectId, enableGitForProjectAction]);

  // Disable Git for project
  const disableGitForProject = useCallback(() => {
    if (!projectId) return;
    disableGitForProjectAction(projectId);
  }, [projectId, disableGitForProjectAction]);

  // Update project config
  const updateProjectConfig = useCallback((config: Partial<ProjectGitConfig>) => {
    if (!projectId) return;
    setProjectConfig(projectId, config);
  }, [projectId, setProjectConfig]);

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
    
    // Project Git
    enableGitForProject,
    disableGitForProject,
    updateProjectConfig,
    
    // Error handling
    clearError,
  };
}

export default useGit;
