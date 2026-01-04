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
const mockSetGitStatus = jest.fn();
const mockSetCurrentRepo = jest.fn();
const mockSetBranches = jest.fn();
const mockSetCommits = jest.fn();
const mockSetFileStatus = jest.fn();
const mockSetError = jest.fn();
const mockClearError = jest.fn();

let mockStoreState = {
  gitStatus: { installed: false, version: null },
  isCheckingGit: false,
  isInstallingGit: false,
  installProgress: null,
  currentRepo: null,
  branches: [] as Array<{ name: string; current: boolean }>,
  commits: [] as Array<{ hash: string; message: string }>,
  fileStatus: [] as Array<{ path: string; status: string }>,
  operationStatus: 'idle' as string,
  isOperating: false,
  error: null as string | null,
  projectConfig: null,
};

jest.mock('@/stores/git', () => ({
  useGitStore: jest.fn((selector) => {
    const state = {
      ...mockStoreState,
      setGitStatus: mockSetGitStatus,
      setCurrentRepo: mockSetCurrentRepo,
      setBranches: mockSetBranches,
      setCommits: mockSetCommits,
      setFileStatus: mockSetFileStatus,
      setError: mockSetError,
      clearError: mockClearError,
      setIsCheckingGit: jest.fn(),
      setIsInstallingGit: jest.fn(),
      setInstallProgress: jest.fn(),
      setOperationStatus: jest.fn(),
      setIsOperating: jest.fn(),
      setProjectConfig: jest.fn(),
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
      currentRepo: null,
      branches: [],
      commits: [],
      fileStatus: [],
      operationStatus: 'idle',
      isOperating: false,
      error: null,
      projectConfig: null,
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
      mockCheckGitInstalled.mockResolvedValue({ installed: true, version: '2.40.0' });

      const { result } = renderHook(() => useGit({ autoCheck: false }));

      await act(async () => {
        await result.current.checkGitInstalled();
      });

      expect(mockCheckGitInstalled).toHaveBeenCalled();
    });
  });

  describe('repository actions', () => {
    it('should init repository', async () => {
      mockInitRepo.mockResolvedValue(true);

      const { result } = renderHook(() => useGit({ autoCheck: false }));

      let success: boolean;
      await act(async () => {
        success = await result.current.initRepo('/path/to/repo');
      });

      expect(mockInitRepo).toHaveBeenCalledWith('/path/to/repo', undefined);
      expect(success!).toBe(true);
    });

    it('should clone repository', async () => {
      mockCloneRepo.mockResolvedValue(true);

      const { result } = renderHook(() => useGit({ autoCheck: false }));

      let success: boolean;
      await act(async () => {
        success = await result.current.cloneRepo('https://github.com/test/repo.git', '/target');
      });

      expect(mockCloneRepo).toHaveBeenCalled();
      expect(success!).toBe(true);
    });
  });

  describe('staging actions', () => {
    it('should stage files', async () => {
      mockStage.mockResolvedValue(true);

      const { result } = renderHook(() => useGit({ autoCheck: false }));

      let success: boolean;
      await act(async () => {
        success = await result.current.stage(['file1.ts', 'file2.ts']);
      });

      expect(mockStage).toHaveBeenCalledWith(['file1.ts', 'file2.ts']);
      expect(success!).toBe(true);
    });

    it('should stage all files', async () => {
      mockStage.mockResolvedValue(true);

      const { result } = renderHook(() => useGit({ autoCheck: false }));

      await act(async () => {
        await result.current.stageAll();
      });

      expect(mockStage).toHaveBeenCalled();
    });
  });

  describe('commit actions', () => {
    it('should commit changes', async () => {
      mockCommit.mockResolvedValue(true);

      const { result } = renderHook(() => useGit({ autoCheck: false }));

      let success: boolean;
      await act(async () => {
        success = await result.current.commit('feat: add new feature');
      });

      expect(mockCommit).toHaveBeenCalledWith('feat: add new feature', undefined);
      expect(success!).toBe(true);
    });

    it('should commit with options', async () => {
      mockCommit.mockResolvedValue(true);

      const { result } = renderHook(() => useGit({ autoCheck: false }));

      await act(async () => {
        await result.current.commit('fix: bug fix', { description: 'Details', amend: true });
      });

      expect(mockCommit).toHaveBeenCalledWith('fix: bug fix', { description: 'Details', amend: true });
    });
  });

  describe('remote actions', () => {
    it('should push changes', async () => {
      mockPush.mockResolvedValue(true);

      const { result } = renderHook(() => useGit({ autoCheck: false }));

      let success: boolean;
      await act(async () => {
        success = await result.current.push();
      });

      expect(mockPush).toHaveBeenCalled();
      expect(success!).toBe(true);
    });

    it('should pull changes', async () => {
      mockPull.mockResolvedValue(true);

      const { result } = renderHook(() => useGit({ autoCheck: false }));

      let success: boolean;
      await act(async () => {
        success = await result.current.pull();
      });

      expect(mockPull).toHaveBeenCalled();
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
