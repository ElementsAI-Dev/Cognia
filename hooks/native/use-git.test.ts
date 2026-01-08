/**
 * Tests for useGit hook
 */

import { renderHook, act } from '@testing-library/react';
import { useGit } from './use-git';

// Mock git service
const mockCheckGitInstalled = jest.fn();
const mockInstallGit = jest.fn();
const mockInitRepo = jest.fn();
const mockCloneRepo = jest.fn();
const mockGetStatus = jest.fn();
const mockStage = jest.fn();
const mockCommit = jest.fn();
const mockPush = jest.fn();
const mockPull = jest.fn();

jest.mock('@/lib/native/git', () => ({
  gitService: {
    isAvailable: jest.fn(() => false),
    checkInstalled: () => mockCheckGitInstalled(),
    install: () => mockInstallGit(),
    initRepo: (...args: unknown[]) => mockInitRepo(...args),
    cloneRepo: (...args: unknown[]) => mockCloneRepo(...args),
    getStatus: (...args: unknown[]) => mockGetStatus(...args),
    stage: (...args: unknown[]) => mockStage(...args),
    stageAll: (...args: unknown[]) => mockStage(...args),
    unstage: jest.fn(() => Promise.resolve(true)),
    commit: (...args: unknown[]) => mockCommit(...args),
    push: (...args: unknown[]) => mockPush(...args),
    pull: (...args: unknown[]) => mockPull(...args),
    openGitWebsite: jest.fn(),
    createBranch: jest.fn(() => Promise.resolve(true)),
    deleteBranch: jest.fn(() => Promise.resolve(true)),
    checkout: jest.fn(() => Promise.resolve(true)),
    fetch: jest.fn(() => Promise.resolve(true)),
    discardChanges: jest.fn(() => Promise.resolve(true)),
    refreshStatus: jest.fn(() => Promise.resolve()),
  },
}));

// Mock store
const mockCheckGitInstalledStore = jest.fn().mockResolvedValue(undefined);
const mockInstallGitStore = jest.fn().mockResolvedValue(undefined);
const mockSetCurrentRepo = jest.fn();
const mockLoadRepoStatus = jest.fn().mockResolvedValue(undefined);
const mockLoadBranches = jest.fn().mockResolvedValue(undefined);
const mockLoadCommitHistory = jest.fn().mockResolvedValue(undefined);
const mockLoadFileStatus = jest.fn().mockResolvedValue(undefined);
const mockInitRepoStore = jest.fn().mockResolvedValue(true);
const mockCloneRepoStore = jest.fn().mockResolvedValue(true);
const mockStageFilesStore = jest.fn().mockResolvedValue(true);
const mockStageAllStore = jest.fn().mockResolvedValue(true);
const mockUnstageFilesStore = jest.fn().mockResolvedValue(true);
const mockCommitStore = jest.fn().mockResolvedValue(true);
const mockCreateBranchStore = jest.fn().mockResolvedValue(true);
const mockDeleteBranchStore = jest.fn().mockResolvedValue(true);
const mockCheckoutStore = jest.fn().mockResolvedValue(true);
const mockPushStore = jest.fn().mockResolvedValue(true);
const mockPullStore = jest.fn().mockResolvedValue(true);
const mockFetchStore = jest.fn().mockResolvedValue(true);
const mockDiscardChangesStore = jest.fn().mockResolvedValue(true);
const mockLoadStashListStore = jest.fn().mockResolvedValue(undefined);
const mockClearError = jest.fn();
const mockGetProjectConfig = jest.fn().mockReturnValue(null);
const mockSetProjectConfig = jest.fn();
const mockEnableGitForProject = jest.fn().mockResolvedValue(true);
const mockDisableGitForProject = jest.fn();

let mockStoreState = {
  gitStatus: { installed: false, version: null },
  isCheckingGit: false,
  isInstallingGit: false,
  installProgress: null,
  currentRepoInfo: null as null | { isGitRepo: boolean },
  branches: [] as Array<{ name: string; current: boolean }>,
  commits: [] as Array<{ hash: string; message: string }>,
  fileStatus: [] as Array<{ path: string; status: string }>,
  operationStatus: 'idle' as string,
  lastError: null as string | null,
};

jest.mock('@/stores/git', () => ({
  useGitStore: jest.fn((selector) => {
    const state = {
      ...mockStoreState,
      checkGitInstalled: mockCheckGitInstalledStore,
      installGit: mockInstallGitStore,
      setCurrentRepo: mockSetCurrentRepo,
      loadRepoStatus: mockLoadRepoStatus,
      loadBranches: mockLoadBranches,
      loadCommitHistory: mockLoadCommitHistory,
      loadFileStatus: mockLoadFileStatus,
      initRepo: mockInitRepoStore,
      cloneRepo: mockCloneRepoStore,
      stageFiles: mockStageFilesStore,
      stageAll: mockStageAllStore,
      unstageFiles: mockUnstageFilesStore,
      commit: mockCommitStore,
      createBranch: mockCreateBranchStore,
      deleteBranch: mockDeleteBranchStore,
      checkout: mockCheckoutStore,
      push: mockPushStore,
      pull: mockPullStore,
      fetch: mockFetchStore,
      discardChanges: mockDiscardChangesStore,
      loadStashList: mockLoadStashListStore,
      getProjectConfig: mockGetProjectConfig,
      setProjectConfig: mockSetProjectConfig,
      enableGitForProject: mockEnableGitForProject,
      disableGitForProject: mockDisableGitForProject,
      clearError: mockClearError,
    };
    return selector(state);
  }),
}));

describe('useGit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState = {
      gitStatus: { installed: false, version: null },
      isCheckingGit: false,
      isInstallingGit: false,
      installProgress: null,
      currentRepoInfo: null,
      branches: [],
      commits: [],
      fileStatus: [],
      operationStatus: 'idle',
      lastError: null,
    };
  });

  describe('initialization', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useGit({ autoCheck: false }));

      expect(result.current.gitStatus).toBeDefined();
      expect(result.current.isInstalled).toBe(false);
      expect(result.current.currentRepo).toBeNull();
      expect(result.current.branches).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should provide action functions', () => {
      const { result } = renderHook(() => useGit({ autoCheck: false }));

      expect(typeof result.current.checkGitInstalled).toBe('function');
      expect(typeof result.current.installGit).toBe('function');
      expect(typeof result.current.initRepo).toBe('function');
      expect(typeof result.current.cloneRepo).toBe('function');
      expect(typeof result.current.stage).toBe('function');
      expect(typeof result.current.commit).toBe('function');
      expect(typeof result.current.push).toBe('function');
      expect(typeof result.current.pull).toBe('function');
    });
  });

  describe('checkGitInstalled', () => {
    it('should check git installation', async () => {
      const { result } = renderHook(() => useGit({ autoCheck: false }));

      await act(async () => {
        await result.current.checkGitInstalled();
      });

      expect(mockCheckGitInstalledStore).toHaveBeenCalled();
    });
  });

  describe('repository actions', () => {
    it('should init repository', async () => {
      const { result } = renderHook(() => useGit({ autoCheck: false }));

      let success: boolean;
      await act(async () => {
        success = await result.current.initRepo('/path/to/repo');
      });

      expect(mockInitRepoStore).toHaveBeenCalledWith('/path/to/repo', undefined);
      expect(success!).toBe(true);
    });

    it('should clone repository', async () => {
      const { result } = renderHook(() => useGit({ autoCheck: false }));

      let success: boolean;
      await act(async () => {
        success = await result.current.cloneRepo('https://github.com/test/repo.git', '/target');
      });

      expect(mockCloneRepoStore).toHaveBeenCalled();
      expect(success!).toBe(true);
    });
  });

  describe('staging actions', () => {
    it('should stage files', async () => {
      const { result } = renderHook(() => useGit({ autoCheck: false }));

      let success: boolean;
      await act(async () => {
        success = await result.current.stage(['file1.ts', 'file2.ts']);
      });

      expect(mockStageFilesStore).toHaveBeenCalledWith(['file1.ts', 'file2.ts']);
      expect(success!).toBe(true);
    });

    it('should stage all files', async () => {
      const { result } = renderHook(() => useGit({ autoCheck: false }));

      await act(async () => {
        await result.current.stageAll();
      });

      expect(mockStageAllStore).toHaveBeenCalled();
    });
  });

  describe('commit actions', () => {
    it('should commit changes', async () => {
      const { result } = renderHook(() => useGit({ autoCheck: false }));

      let success: boolean;
      await act(async () => {
        success = await result.current.commit('feat: add new feature');
      });

      expect(mockCommitStore).toHaveBeenCalledWith('feat: add new feature', undefined);
      expect(success!).toBe(true);
    });

    it('should commit with options', async () => {
      const { result } = renderHook(() => useGit({ autoCheck: false }));

      await act(async () => {
        await result.current.commit('fix: bug fix', { description: 'Details', amend: true });
      });

      expect(mockCommitStore).toHaveBeenCalledWith('fix: bug fix', { description: 'Details', amend: true });
    });
  });

  describe('remote actions', () => {
    it('should push changes', async () => {
      const { result } = renderHook(() => useGit({ autoCheck: false }));

      let success: boolean;
      await act(async () => {
        success = await result.current.push();
      });

      expect(mockPushStore).toHaveBeenCalled();
      expect(success!).toBe(true);
    });

    it('should pull changes', async () => {
      const { result } = renderHook(() => useGit({ autoCheck: false }));

      let success: boolean;
      await act(async () => {
        success = await result.current.pull();
      });

      expect(mockPullStore).toHaveBeenCalled();
      expect(success!).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useGit({ autoCheck: false }));

      act(() => {
        result.current.clearError();
      });

      expect(mockClearError).toHaveBeenCalled();
    });
  });
});
