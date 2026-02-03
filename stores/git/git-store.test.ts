/**
 * Git Store Tests
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useGitStore } from './git-store';

// Mock the git service
jest.mock('@/lib/native/git', () => ({
  gitService: {
    isAvailable: jest.fn(() => false),
    checkInstalled: jest.fn().mockResolvedValue({
      installed: true,
      version: '2.40.0',
      path: '/usr/bin/git',
      status: 'installed',
      error: null,
      lastChecked: new Date().toISOString(),
    }),
    install: jest.fn().mockResolvedValue({
      installed: true,
      version: '2.40.0',
      path: '/usr/bin/git',
      status: 'installed',
      error: null,
      lastChecked: new Date().toISOString(),
    }),
    getConfig: jest.fn().mockResolvedValue({
      userName: 'Test User',
      userEmail: 'test@example.com',
      defaultBranch: 'main',
      editor: 'code',
    }),
    setConfig: jest.fn().mockResolvedValue(undefined),
    init: jest.fn().mockResolvedValue({
      success: true,
      data: {
        path: '/test/repo',
        isGitRepo: true,
        status: 'clean',
        branch: 'main',
        remoteName: null,
        remoteUrl: null,
        ahead: 0,
        behind: 0,
        hasUncommittedChanges: false,
        hasUntrackedFiles: false,
        lastCommit: null,
      },
    }),
    clone: jest.fn().mockResolvedValue({
      success: true,
      data: {
        path: '/test/cloned',
        isGitRepo: true,
        status: 'clean',
        branch: 'main',
        remoteName: 'origin',
        remoteUrl: 'https://github.com/test/repo.git',
        ahead: 0,
        behind: 0,
        hasUncommittedChanges: false,
        hasUntrackedFiles: false,
        lastCommit: null,
      },
    }),
    getStatus: jest.fn().mockResolvedValue({
      success: true,
      data: {
        path: '/test/repo',
        isGitRepo: true,
        status: 'clean',
        branch: 'main',
        remoteName: 'origin',
        remoteUrl: 'https://github.com/test/repo.git',
        ahead: 0,
        behind: 0,
        hasUncommittedChanges: false,
        hasUntrackedFiles: false,
        lastCommit: {
          hash: 'abc123',
          shortHash: 'abc123',
          author: 'Test User',
          authorEmail: 'test@example.com',
          date: new Date().toISOString(),
          message: 'Initial commit',
        },
      },
    }),
    isRepo: jest.fn().mockResolvedValue(true),
    stage: jest.fn().mockResolvedValue({ success: true }),
    stageAll: jest.fn().mockResolvedValue({ success: true }),
    unstage: jest.fn().mockResolvedValue({ success: true }),
    commit: jest.fn().mockResolvedValue({
      success: true,
      data: {
        hash: 'def456',
        shortHash: 'def456',
        author: 'Test User',
        authorEmail: 'test@example.com',
        date: new Date().toISOString(),
        message: 'Test commit',
      },
    }),
    getLog: jest.fn().mockResolvedValue({
      success: true,
      data: [
        {
          hash: 'abc123',
          shortHash: 'abc123',
          author: 'Test User',
          authorEmail: 'test@example.com',
          date: new Date().toISOString(),
          message: 'Initial commit',
        },
      ],
    }),
    getFileStatus: jest.fn().mockResolvedValue({
      success: true,
      data: [],
    }),
    getBranches: jest.fn().mockResolvedValue({
      success: true,
      data: [
        { name: 'main', isRemote: false, isCurrent: true },
        { name: 'develop', isRemote: false, isCurrent: false },
      ],
    }),
    createBranch: jest.fn().mockResolvedValue({ success: true }),
    deleteBranch: jest.fn().mockResolvedValue({ success: true }),
    checkout: jest.fn().mockResolvedValue({ success: true }),
    merge: jest.fn().mockResolvedValue({ success: true }),
    push: jest.fn().mockResolvedValue({ success: true }),
    pull: jest.fn().mockResolvedValue({ success: true }),
    fetch: jest.fn().mockResolvedValue({ success: true }),
    discardChanges: jest.fn().mockResolvedValue({ success: true }),
    autoCommit: jest.fn().mockResolvedValue({ success: true }),
    getDiffBetween: jest.fn().mockResolvedValue({
      success: true,
      data: [
        {
          path: 'test.txt',
          status: 'modified',
          additions: 5,
          deletions: 2,
          diff: '@@ -1,3 +1,6 @@\n line1\n+new line\n line2',
        },
      ],
    }),
    getFullStatus: jest.fn().mockResolvedValue({
      success: true,
      data: {
        repoInfo: {
          path: '/test/repo',
          isGitRepo: true,
          status: 'clean',
          branch: 'main',
          remoteName: 'origin',
          remoteUrl: 'https://github.com/test/repo.git',
          ahead: 0,
          behind: 0,
          hasUncommittedChanges: false,
          hasUntrackedFiles: false,
          lastCommit: null,
        },
        branches: [{ name: 'main', isRemote: false, isCurrent: true }],
        commits: [],
        fileStatus: [],
        stashList: [],
        remotes: [],
      },
    }),
  },
}));

describe('useGitStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useGitStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useGitStore());

      expect(result.current.gitStatus.installed).toBe(false);
      expect(result.current.isCheckingGit).toBe(false);
      expect(result.current.isInstallingGit).toBe(false);
      expect(result.current.currentRepoPath).toBeNull();
      expect(result.current.currentRepoInfo).toBeNull();
      expect(result.current.branches).toEqual([]);
      expect(result.current.commits).toEqual([]);
      expect(result.current.fileStatus).toEqual([]);
      expect(result.current.operationStatus).toBe('idle');
      expect(result.current.lastError).toBeNull();
    });
  });

  describe('checkGitInstalled', () => {
    it('should update gitStatus when Git is installed', async () => {
      const { result } = renderHook(() => useGitStore());

      await act(async () => {
        await result.current.checkGitInstalled();
      });

      expect(result.current.gitStatus.installed).toBe(true);
      expect(result.current.gitStatus.version).toBe('2.40.0');
      expect(result.current.isCheckingGit).toBe(false);
    });
  });

  describe('project configuration', () => {
    it('should get default project config for unknown project', () => {
      const { result } = renderHook(() => useGitStore());

      const config = result.current.getProjectConfig('unknown-project');

      expect(config.enabled).toBe(false);
      expect(config.repoPath).toBeNull();
      expect(config.autoCommit).toBe(false);
    });

    it('should set and get project config', () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setProjectConfig('test-project', {
          enabled: true,
          repoPath: '/test/repo',
          autoCommit: true,
        });
      });

      const config = result.current.getProjectConfig('test-project');

      expect(config.enabled).toBe(true);
      expect(config.repoPath).toBe('/test/repo');
      expect(config.autoCommit).toBe(true);
    });
  });

  describe('auto-commit configuration', () => {
    it('should have default auto-commit config', () => {
      const { result } = renderHook(() => useGitStore());

      expect(result.current.autoCommitConfig.enabled).toBe(false);
      expect(result.current.autoCommitConfig.triggers).toContain('session_end');
      expect(result.current.autoCommitConfig.triggers).toContain('export');
    });

    it('should update auto-commit config', () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setAutoCommitConfig({
          enabled: true,
          intervalMinutes: 15,
        });
      });

      expect(result.current.autoCommitConfig.enabled).toBe(true);
      expect(result.current.autoCommitConfig.intervalMinutes).toBe(15);
    });
  });

  describe('tracked repositories', () => {
    it('should add tracked repository', () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.addTrackedRepo('/test/repo');
      });

      expect(result.current.trackedRepos).toContain('/test/repo');
    });

    it('should not add duplicate tracked repository', () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.addTrackedRepo('/test/repo');
        result.current.addTrackedRepo('/test/repo');
      });

      expect(result.current.trackedRepos.filter((r) => r === '/test/repo').length).toBe(1);
    });

    it('should remove tracked repository', () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.addTrackedRepo('/test/repo');
        result.current.removeTrackedRepo('/test/repo');
      });

      expect(result.current.trackedRepos).not.toContain('/test/repo');
    });
  });

  describe('error handling', () => {
    it('should set and clear error', () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.lastError).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.lastError).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useGitStore());

      // Modify state
      act(() => {
        result.current.setError('Test error');
        result.current.addTrackedRepo('/test/repo');
        result.current.setAutoCommitConfig({ enabled: true });
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.lastError).toBeNull();
      expect(result.current.trackedRepos).toEqual([]);
      expect(result.current.autoCommitConfig.enabled).toBe(false);
    });
  });

  describe('merge branch', () => {
    it('should merge branch successfully', async () => {
      const { result } = renderHook(() => useGitStore());

      // Set current repo
      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await waitFor(async () => {
        const success = await result.current.mergeBranch('develop');
        expect(success).toBe(true);
      });
    });

    it('should return false when no repo is set', async () => {
      const { result } = renderHook(() => useGitStore());

      const success = await result.current.mergeBranch('develop');
      expect(success).toBe(false);
    });
  });

  describe('get diff between', () => {
    it('should get diff between refs successfully', async () => {
      const { result } = renderHook(() => useGitStore());

      // Set current repo
      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await waitFor(async () => {
        const diffs = await result.current.getDiffBetween('HEAD^', 'HEAD');
        expect(diffs).toBeDefined();
        expect(Array.isArray(diffs)).toBe(true);
      });
    });

    it('should return null when no repo is set', async () => {
      const { result } = renderHook(() => useGitStore());

      const diffs = await result.current.getDiffBetween('HEAD^', 'HEAD');
      expect(diffs).toBeNull();
    });
  });

  describe('load full status', () => {
    it('should load full status successfully', async () => {
      const { result } = renderHook(() => useGitStore());

      // Set current repo
      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await act(async () => {
        await result.current.loadFullStatus();
      });

      expect(result.current.currentRepoInfo).toBeDefined();
      expect(result.current.branches).toBeDefined();
    });
  });
});
