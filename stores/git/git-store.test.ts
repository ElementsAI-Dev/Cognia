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
    getRemotes: jest.fn().mockResolvedValue({
      success: true,
      data: [
        { name: 'origin', url: 'https://github.com/test/repo.git', type: 'fetch' },
        { name: 'origin', url: 'https://github.com/test/repo.git', type: 'push' },
      ],
    }),
    addRemote: jest.fn().mockResolvedValue({ success: true }),
    removeRemote: jest.fn().mockResolvedValue({ success: true }),
    getTagList: jest.fn().mockResolvedValue({
      success: true,
      data: [
        {
          name: 'v1.0.0',
          commitHash: 'abc1234',
          shortHash: 'abc1234',
          message: 'Release 1.0.0',
          tagger: 'Test User',
          date: new Date().toISOString(),
          isAnnotated: true,
        },
      ],
    }),
    createTag: jest.fn().mockResolvedValue({
      success: true,
      data: {
        name: 'v2.0.0',
        commitHash: 'def5678',
        shortHash: 'def5678',
        message: 'Release 2.0.0',
        isAnnotated: true,
      },
    }),
    deleteTag: jest.fn().mockResolvedValue({ success: true }),
    pushTag: jest.fn().mockResolvedValue({ success: true }),
    revert: jest.fn().mockResolvedValue({
      success: true,
      data: {
        hash: 'rev123',
        shortHash: 'rev123',
        author: 'Test User',
        authorEmail: 'test@example.com',
        date: new Date().toISOString(),
        message: 'Revert "Test commit"',
      },
    }),
    revertAbort: jest.fn().mockResolvedValue({ success: true }),
    cherryPick: jest.fn().mockResolvedValue({
      success: true,
      data: {
        hash: 'cp123',
        shortHash: 'cp123',
        author: 'Test User',
        authorEmail: 'test@example.com',
        date: new Date().toISOString(),
        message: 'Cherry-picked commit',
      },
    }),
    cherryPickAbort: jest.fn().mockResolvedValue({ success: true }),
    renameBranch: jest.fn().mockResolvedValue({ success: true }),
    showCommit: jest.fn().mockResolvedValue({
      success: true,
      data: {
        commit: {
          hash: 'abc123full',
          shortHash: 'abc123',
          author: 'Test User',
          authorEmail: 'test@example.com',
          date: new Date().toISOString(),
          message: 'Test commit',
        },
        fileChanges: [
          { path: 'test.txt', additions: 5, deletions: 2 },
        ],
        diffContent: '@@ -1,3 +1,6 @@\n line1\n+new line',
        parents: ['parent123'],
        totalAdditions: 5,
        totalDeletions: 2,
      },
    }),
    mergeAbort: jest.fn().mockResolvedValue({ success: true }),
    stash: jest.fn().mockResolvedValue({ success: true }),
    getStashList: jest.fn().mockResolvedValue({ success: true, data: [] }),
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
    getLogGraph: jest.fn().mockResolvedValue({
      success: true,
      data: [
        {
          hash: 'abc123def456',
          shortHash: 'abc123d',
          author: 'Test User',
          authorEmail: 'test@example.com',
          date: new Date().toISOString(),
          message: 'Test commit',
          parents: [],
          refs: ['HEAD -> main'],
          lane: 0,
        },
      ],
    }),
    getRepoStats: jest.fn().mockResolvedValue({
      success: true,
      data: {
        totalCommits: 100,
        totalContributors: 3,
        contributors: [
          { name: 'Test User', email: 'test@example.com', commits: 50, additions: 1000, deletions: 200, firstCommit: '2024-01-01', lastCommit: '2025-01-01' },
        ],
        activity: [{ date: '2025-01-01', commits: 5 }],
        fileTypeDistribution: { '.ts': 50, '.tsx': 30 },
      },
    }),
    checkpointCreate: jest.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'cognia-cp/2025-01-15T10-00-00',
        hash: 'cp123abc',
        message: 'Test checkpoint',
        timestamp: '2025-01-15T10:00:00Z',
        filesChanged: 5,
        additions: 30,
        deletions: 10,
      },
    }),
    checkpointList: jest.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 'cognia-cp/2025-01-15T10-00-00',
          hash: 'cp123abc',
          message: 'Test checkpoint',
          timestamp: '2025-01-15T10:00:00Z',
          filesChanged: 5,
          additions: 30,
          deletions: 10,
        },
      ],
    }),
    checkpointRestore: jest.fn().mockResolvedValue({ success: true }),
    checkpointDelete: jest.fn().mockResolvedValue({ success: true }),
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

    it('should populate remotes from full status', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await act(async () => {
        await result.current.loadFullStatus();
      });

      expect(result.current.remotes).toEqual([]);
    });
  });

  describe('initial state for new fields', () => {
    it('should have empty remotes and tags initially', () => {
      const { result } = renderHook(() => useGitStore());
      expect(result.current.remotes).toEqual([]);
      expect(result.current.tags).toEqual([]);
    });
  });

  describe('remote management', () => {
    it('should load remotes', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await act(async () => {
        await result.current.loadRemotes();
      });

      expect(result.current.remotes.length).toBeGreaterThan(0);
      expect(result.current.remotes[0].name).toBe('origin');
    });

    it('should add a remote', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await waitFor(async () => {
        const success = await result.current.addRemote('upstream', 'https://github.com/upstream/repo.git');
        expect(success).toBe(true);
      });
    });

    it('should remove a remote', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await waitFor(async () => {
        const success = await result.current.removeRemote('upstream');
        expect(success).toBe(true);
      });
    });

    it('should return false when no repo is set', async () => {
      const { result } = renderHook(() => useGitStore());

      const success = await result.current.addRemote('upstream', 'https://example.com');
      expect(success).toBe(false);
    });
  });

  describe('tag operations', () => {
    it('should load tags', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await act(async () => {
        await result.current.loadTags();
      });

      expect(result.current.tags.length).toBeGreaterThan(0);
      expect(result.current.tags[0].name).toBe('v1.0.0');
      expect(result.current.tags[0].isAnnotated).toBe(true);
    });

    it('should create a tag', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await waitFor(async () => {
        const success = await result.current.createTag('v2.0.0', { message: 'Release 2.0.0' });
        expect(success).toBe(true);
      });
    });

    it('should delete a tag', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await waitFor(async () => {
        const success = await result.current.deleteTag('v1.0.0');
        expect(success).toBe(true);
      });
    });

    it('should push a tag', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await waitFor(async () => {
        const success = await result.current.pushTag('v1.0.0');
        expect(success).toBe(true);
      });
    });

    it('should return false when no repo is set', async () => {
      const { result } = renderHook(() => useGitStore());

      const success = await result.current.createTag('v3.0.0');
      expect(success).toBe(false);
    });
  });

  describe('revert operations', () => {
    it('should revert a commit', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await waitFor(async () => {
        const success = await result.current.revertCommit('abc123');
        expect(success).toBe(true);
      });
    });

    it('should abort a revert', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await waitFor(async () => {
        const success = await result.current.revertAbort();
        expect(success).toBe(true);
      });
    });

    it('should return false when no repo is set', async () => {
      const { result } = renderHook(() => useGitStore());

      const success = await result.current.revertCommit('abc123');
      expect(success).toBe(false);
    });
  });

  describe('cherry-pick operations', () => {
    it('should cherry-pick a commit', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await waitFor(async () => {
        const success = await result.current.cherryPick('abc123');
        expect(success).toBe(true);
      });
    });

    it('should abort a cherry-pick', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await waitFor(async () => {
        const success = await result.current.cherryPickAbort();
        expect(success).toBe(true);
      });
    });

    it('should return false when no repo is set', async () => {
      const { result } = renderHook(() => useGitStore());

      const success = await result.current.cherryPick('abc123');
      expect(success).toBe(false);
    });
  });

  describe('branch rename', () => {
    it('should rename a branch', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await waitFor(async () => {
        const success = await result.current.renameBranch('old-branch', 'new-branch');
        expect(success).toBe(true);
      });
    });

    it('should return false when no repo is set', async () => {
      const { result } = renderHook(() => useGitStore());

      const success = await result.current.renameBranch('old', 'new');
      expect(success).toBe(false);
    });
  });

  describe('show commit', () => {
    it('should show commit details', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      let detail: Awaited<ReturnType<typeof result.current.showCommit>>;
      await act(async () => {
        detail = await result.current.showCommit('abc123');
      });

      expect(detail!).toBeDefined();
      expect(detail!.commit.hash).toBe('abc123full');
      expect(detail!.totalAdditions).toBe(5);
      expect(detail!.totalDeletions).toBe(2);
      expect(detail!.fileChanges).toHaveLength(1);
      expect(detail!.parents).toContain('parent123');
    });

    it('should return null when no repo is set', async () => {
      const { result } = renderHook(() => useGitStore());

      const detail = await result.current.showCommit('abc123');
      expect(detail).toBeNull();
    });
  });

  describe('merge abort', () => {
    it('should abort a merge', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await waitFor(async () => {
        const success = await result.current.mergeAbort();
        expect(success).toBe(true);
      });
    });

    it('should return false when no repo is set', async () => {
      const { result } = renderHook(() => useGitStore());

      const success = await result.current.mergeAbort();
      expect(success).toBe(false);
    });
  });

  describe('graph commits', () => {
    it('should have empty graphCommits initially', () => {
      const { result } = renderHook(() => useGitStore());
      expect(result.current.graphCommits).toEqual([]);
    });

    it('should load graph commits', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await act(async () => {
        await result.current.loadGraphCommits();
      });

      expect(result.current.graphCommits.length).toBeGreaterThan(0);
      expect(result.current.graphCommits[0].hash).toBe('abc123def456');
      expect(result.current.graphCommits[0].message).toBe('Test commit');
    });

    it('should load graph commits with maxCount', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await act(async () => {
        await result.current.loadGraphCommits(50);
      });

      expect(result.current.graphCommits.length).toBeGreaterThan(0);
    });

    it('should not load graph commits when no repo is set', async () => {
      const { result } = renderHook(() => useGitStore());

      await act(async () => {
        await result.current.loadGraphCommits();
      });

      expect(result.current.graphCommits).toEqual([]);
    });
  });

  describe('repo stats', () => {
    it('should have null repoStats initially', () => {
      const { result } = renderHook(() => useGitStore());
      expect(result.current.repoStats).toBeNull();
    });

    it('should load repo stats', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await act(async () => {
        await result.current.loadRepoStats();
      });

      expect(result.current.repoStats).toBeDefined();
      expect(result.current.repoStats!.totalCommits).toBe(100);
      expect(result.current.repoStats!.totalContributors).toBe(3);
    });

    it('should not load repo stats when no repo is set', async () => {
      const { result } = renderHook(() => useGitStore());

      await act(async () => {
        await result.current.loadRepoStats();
      });

      expect(result.current.repoStats).toBeNull();
    });
  });

  describe('checkpoint operations', () => {
    it('should have empty checkpoints initially', () => {
      const { result } = renderHook(() => useGitStore());
      expect(result.current.checkpoints).toEqual([]);
    });

    it('should create a checkpoint', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await waitFor(async () => {
        const success = await result.current.createCheckpoint('Test checkpoint');
        expect(success).toBe(true);
      });
    });

    it('should load checkpoints', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await act(async () => {
        await result.current.loadCheckpoints();
      });

      expect(result.current.checkpoints.length).toBeGreaterThan(0);
      expect(result.current.checkpoints[0].id).toBe('cognia-cp/2025-01-15T10-00-00');
      expect(result.current.checkpoints[0].message).toBe('Test checkpoint');
    });

    it('should restore a checkpoint', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await waitFor(async () => {
        const success = await result.current.restoreCheckpoint('cognia-cp/2025-01-15T10-00-00');
        expect(success).toBe(true);
      });
    });

    it('should delete a checkpoint', async () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setCurrentRepo('/test/repo');
      });

      await waitFor(async () => {
        const success = await result.current.deleteCheckpoint('cognia-cp/2025-01-15T10-00-00');
        expect(success).toBe(true);
      });
    });

    it('should return false for checkpoint operations when no repo is set', async () => {
      const { result } = renderHook(() => useGitStore());

      const createResult = await result.current.createCheckpoint('Test');
      expect(createResult).toBe(false);

      const restoreResult = await result.current.restoreCheckpoint('id');
      expect(restoreResult).toBe(false);

      const deleteResult = await result.current.deleteCheckpoint('id');
      expect(deleteResult).toBe(false);
    });
  });
});
