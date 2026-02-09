/**
 * Git Integration Service for Workflow Templates
 * 
 * Provides Git operations for managing workflow templates in Git repositories
 */

import type { GitRepository, GitIntegrationConfig } from '@/types/workflow/template';
import { loggers } from '@/lib/logger';
import {
  cloneRepo,
  pull,
  push,
  getRepoStatus,
  stageFiles,
  commit,
  checkout,
  getBranches,
  getLog,
  fetch,
  reset,
  getDiff,
  getDiffFile,
  isGitAvailable,
} from '@/lib/native/git';
import type {
  GitRepoInfo,
  GitCommitInfo,
  GitBranchInfo,
  GitDiffInfo,
} from '@/types/system/git';

const log = loggers.app;

/**
 * Git integration service
 */
export class GitIntegrationService {
  private config: GitIntegrationConfig;
  private repositories: Map<string, GitRepository> = new Map();

  constructor(config: GitIntegrationConfig) {
    this.config = config;
  }

  /**
   * Clone a Git repository
   */
  async cloneRepository(
    url: string,
    destination: string,
    branch?: string
  ): Promise<GitRepoInfo | null> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    if (!isGitAvailable()) {
      throw new Error('Git is not available in this environment');
    }

    const result = await cloneRepo({
      url,
      targetPath: destination,
      branch: branch || this.config.defaultBranch,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to clone repository');
    }

    // Track repository by local path
    this.repositories.set(destination, {
      url,
      localPath: destination,
      branch: branch || this.config.defaultBranch,
      commit: result.data?.lastCommit?.hash || '',
      lastSyncAt: new Date(),
      hasUpdates: false,
      conflictCount: 0,
    });

    return result.data || null;
  }

  /**
   * Pull latest changes from remote
   */
  async pullChanges(path: string): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    if (!isGitAvailable()) {
      throw new Error('Git is not available in this environment');
    }

    const result = await pull({ repoPath: path });

    if (!result.success) {
      throw new Error(result.error || 'Failed to pull changes');
    }

    // Update repository info
    const repo = this.repositories.get(path);
    if (repo) {
      this.repositories.set(path, {
        ...repo,
        lastSyncAt: new Date(),
        hasUpdates: false,
      });
    }
  }

  /**
   * Push changes to remote
   */
  async pushChanges(path: string): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    if (!isGitAvailable()) {
      throw new Error('Git is not available in this environment');
    }

    const result = await push({ repoPath: path });

    if (!result.success) {
      throw new Error(result.error || 'Failed to push changes');
    }

    // Update repository info
    const repo = this.repositories.get(path);
    if (repo) {
      this.repositories.set(path, {
        ...repo,
        lastSyncAt: new Date(),
      });
    }
  }

  /**
   * Get repository status
   */
  async getRepositoryStatus(path: string): Promise<GitRepoInfo> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    if (!isGitAvailable()) {
      throw new Error('Git is not available in this environment');
    }

    const result = await getRepoStatus(path);

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get repository status');
    }

    return result.data;
  }

  /**
   * Stage files
   */
  async stageFilesInRepo(path: string, files: string[]): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    if (!isGitAvailable()) {
      throw new Error('Git is not available in this environment');
    }

    const result = await stageFiles(path, files);

    if (!result.success) {
      throw new Error(result.error || 'Failed to stage files');
    }
  }

  /**
   * Commit changes
   */
  async commitChanges(path: string, message: string): Promise<GitCommitInfo | null> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    if (!isGitAvailable()) {
      throw new Error('Git is not available in this environment');
    }

    const result = await commit({
      repoPath: path,
      message,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to commit changes');
    }

    return result.data || null;
  }

  /**
   * Create a new branch
   */
  async createBranch(path: string, branchName: string): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    if (!isGitAvailable()) {
      throw new Error('Git is not available in this environment');
    }

    const result = await checkout({
      repoPath: path,
      target: branchName,
      createBranch: true,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to create branch');
    }

    // Update repository info
    const repo = this.repositories.get(path);
    if (repo) {
      this.repositories.set(path, {
        ...repo,
        branch: branchName,
      });
    }
  }

  /**
   * Switch branch
   */
  async switchBranch(path: string, branchName: string): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    if (!isGitAvailable()) {
      throw new Error('Git is not available in this environment');
    }

    const result = await checkout({
      repoPath: path,
      target: branchName,
      createBranch: false,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to switch branch');
    }

    // Update repository info
    const repo = this.repositories.get(path);
    if (repo) {
      this.repositories.set(path, {
        ...repo,
        branch: branchName,
      });
    }
  }

  /**
   * Get list of branches
   */
  async getRepoBranches(path: string): Promise<GitBranchInfo[]> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    if (!isGitAvailable()) {
      throw new Error('Git is not available in this environment');
    }

    const result = await getBranches(path, true);

    if (!result.success) {
      throw new Error(result.error || 'Failed to get branches');
    }

    return result.data || [];
  }

  /**
   * Get commit history
   */
  async getCommitHistory(
    path: string,
    limit: number = 10
  ): Promise<GitCommitInfo[]> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    if (!isGitAvailable()) {
      throw new Error('Git is not available in this environment');
    }

    const result = await getLog({
      repoPath: path,
      maxCount: limit,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to get commit history');
    }

    return result.data || [];
  }

  /**
   * Get repository info
   */
  getRepository(path: string): GitRepository | undefined {
    return this.repositories.get(path);
  }

  /**
   * Get all tracked repositories
   */
  getAllRepositories(): GitRepository[] {
    return Array.from(this.repositories.values());
  }

  /**
   * Check for updates
   */
  async checkForUpdates(path: string): Promise<boolean> {
    if (!this.config.enabled || !isGitAvailable()) {
      return false;
    }

    try {
      const result = await fetch(path);
      const repo = this.repositories.get(path);

      if (!result.success) {
        return false;
      }

      // Get status to check if behind
      const statusResult = await getRepoStatus(path);
      const hasUpdates = (statusResult.data?.behind ?? 0) > 0;

      if (repo) {
        this.repositories.set(path, {
          ...repo,
          hasUpdates,
        });
      }

      return hasUpdates;
    } catch (error) {
      log.error('Failed to check for updates', error as Error);
      return false;
    }
  }

  /**
   * Resolve conflicts by resetting
   */
  async resolveConflicts(path: string, mode: 'soft' | 'mixed' | 'hard'): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    if (!isGitAvailable()) {
      throw new Error('Git is not available in this environment');
    }

    const result = await reset({
      repoPath: path,
      mode,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to reset repository');
    }
  }

  /**
   * Get diff
   */
  async getRepoDiff(path: string, file?: string): Promise<GitDiffInfo[] | GitDiffInfo | null> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    if (!isGitAvailable()) {
      throw new Error('Git is not available in this environment');
    }

    if (file) {
      const result = await getDiffFile(path, file);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get diff');
      }
      return result.data || null;
    }

    const result = await getDiff(path);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get diff');
    }
    return result.data || [];
  }

  /**
   * Sync all repositories
   */
  async syncAllRepositories(): Promise<void> {
    if (!this.config.autoSync) {
      return;
    }

    const repos = this.getAllRepositories();
    for (const repo of repos) {
      try {
        // Use localPath for git operations, not URL
        await this.pullChanges(repo.localPath);
      } catch (error) {
        log.error(`Failed to sync repository ${repo.url}`, error as Error);
      }
    }
  }

  /**
   * Stage files (alias for stageFilesInRepo)
   */
  async stageFiles(path: string, files: string[]): Promise<void> {
    return this.stageFilesInRepo(path, files);
  }

  /**
   * Get branches (alias for getRepoBranches)
   */
  async getBranches(path: string): Promise<GitBranchInfo[]> {
    return this.getRepoBranches(path);
  }

  /**
   * Get diff (alias for getRepoDiff)
   */
  async getDiff(path: string, file?: string): Promise<GitDiffInfo[] | GitDiffInfo | null> {
    return this.getRepoDiff(path, file);
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<GitIntegrationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get config
   */
  getConfig(): GitIntegrationConfig {
    return { ...this.config };
  }
}

// Singleton instance
let gitIntegrationService: GitIntegrationService | null = null;

/**
 * Get Git integration service instance
 */
export function getGitIntegrationService(
  config?: GitIntegrationConfig
): GitIntegrationService {
  if (!gitIntegrationService) {
    gitIntegrationService = new GitIntegrationService(
      config || {
        enabled: true,
        autoSync: false,
        syncInterval: 300000,
        defaultBranch: 'main',
      }
    );
  }

  return gitIntegrationService;
}
