/**
 * Git Integration Service for Workflow Templates
 * 
 * Provides Git operations for managing workflow templates in Git repositories
 */

import { invoke } from '@tauri-apps/api/core';
import type { GitRepository, GitIntegrationConfig } from '@/types/workflow/template';

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
  ): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    await invoke<void>('git_clone', {
      url,
      path: destination,
      branch: branch || this.config.defaultBranch,
    });

    // Track repository
    this.repositories.set(destination, {
      url,
      branch: branch || this.config.defaultBranch,
      commit: '',
      lastSyncAt: new Date(),
      hasUpdates: false,
      conflictCount: 0,
    });
  }

  /**
   * Pull latest changes from remote
   */
  async pullChanges(path: string): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    await invoke<void>('git_pull', {
      path,
    });

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

    await invoke<void>('git_push', {
      path,
    });

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
  async getRepositoryStatus(path: string): Promise<{
    branch: string;
    hasChanges: boolean;
    staged: string[];
    unstaged: string[];
    untracked: string[];
  }> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    return await invoke<{
      branch: string;
      hasChanges: boolean;
      staged: string[];
      unstaged: string[];
      untracked: string[];
    }>('git_status', { path });
  }

  /**
   * Stage files
   */
  async stageFiles(path: string, files: string[]): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    await invoke('git_stage', {
      path,
      files,
    });
  }

  /**
   * Commit changes
   */
  async commitChanges(path: string, message: string): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    return await invoke('git_commit', {
      path,
      message,
    });
  }

  /**
   * Create a new branch
   */
  async createBranch(path: string, branchName: string): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    await invoke('git_checkout', {
      path,
      branch: branchName,
      create: true,
    });

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

    await invoke('git_checkout', {
      path,
      branch: branchName,
      create: false,
    });

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
  async getBranches(path: string): Promise<string[]> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    return await invoke<string[]>('git_branches', { path });
  }

  /**
   * Get commit history
   */
  async getCommitHistory(
    path: string,
    limit: number = 10
  ): Promise<
    Array<{
      hash: string;
      message: string;
      author: string;
      date: string;
    }>
  > {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    return await invoke<Array<{
      hash: string;
      message: string;
      author: string;
      date: string;
    }>>('git_log', {
      path,
      limit,
    });
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
    if (!this.config.enabled) {
      return false;
    }

    try {
      const result = await invoke<{ hasUpdates: boolean }>('git_fetch', { path });
      const repo = this.repositories.get(path);
      
      if (repo) {
        this.repositories.set(path, {
          ...repo,
          hasUpdates: result.hasUpdates,
        });
      }

      return result.hasUpdates;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return false;
    }
  }

  /**
   * Resolve conflicts
   */
  async resolveConflicts(path: string, resolution: 'ours' | 'theirs'): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    await invoke('git_reset', {
      path,
      mode: resolution,
    });
  }

  /**
   * Get diff
   */
  async getDiff(path: string, file?: string): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Git integration is disabled');
    }

    return await invoke<string>('git_diff', {
      path,
      file,
    });
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
        await this.pullChanges(repo.url);
      } catch (error) {
        console.error(`Failed to sync repository ${repo.url}:`, error);
      }
    }
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
