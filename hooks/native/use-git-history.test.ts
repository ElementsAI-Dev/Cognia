/**
 * useGitHistory Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useGitHistory } from './use-git-history';
import { gitService } from '@/lib/native/git';
import type { GitOperationRecord, GitReflogEntry } from '@/types/system/git';

// Mock the git service
jest.mock('@/lib/native/git', () => ({
  gitService: {
    getHistory: jest.fn(),
    undoLast: jest.fn(),
    clearHistory: jest.fn(),
    getReflog: jest.fn(),
    recoverToReflog: jest.fn(),
  },
}));

const mockGitService = gitService as jest.Mocked<typeof gitService>;

describe('useGitHistory', () => {
  const mockRepoPath = '/path/to/repo';

  const mockHistoryRecord: GitOperationRecord = {
    id: 'test-id-1',
    operationType: 'commit',
    repoPath: mockRepoPath,
    description: 'Test commit',
    beforeRef: 'abc123',
    afterRef: 'def456',
    canUndo: true,
    affectedFiles: ['file.txt'],
    timestamp: '2025-01-31T12:00:00Z',
    undone: false,
  };

  const mockReflogEntry: GitReflogEntry = {
    hash: 'abc123def456',
    shortHash: 'abc123d',
    selector: 'HEAD@{0}',
    action: 'commit: Test commit',
    date: '2025-01-31 12:00:00 +0000',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useGitHistory({ repoPath: mockRepoPath }));

    expect(result.current.history).toEqual([]);
    expect(result.current.reflog).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should load history successfully', async () => {
    mockGitService.getHistory.mockResolvedValue([mockHistoryRecord]);

    const { result } = renderHook(() => useGitHistory({ repoPath: mockRepoPath }));

    await act(async () => {
      await result.current.loadHistory();
    });

    expect(mockGitService.getHistory).toHaveBeenCalledWith(mockRepoPath, undefined);
    expect(result.current.history).toEqual([mockHistoryRecord]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should load history with limit', async () => {
    mockGitService.getHistory.mockResolvedValue([mockHistoryRecord]);

    const { result } = renderHook(() => useGitHistory({ repoPath: mockRepoPath }));

    await act(async () => {
      await result.current.loadHistory(10);
    });

    expect(mockGitService.getHistory).toHaveBeenCalledWith(mockRepoPath, 10);
  });

  it('should handle history load error', async () => {
    mockGitService.getHistory.mockRejectedValue(new Error('Failed to load'));

    const { result } = renderHook(() => useGitHistory({ repoPath: mockRepoPath }));

    await act(async () => {
      await result.current.loadHistory();
    });

    expect(result.current.error).toBe('Failed to load');
    expect(result.current.history).toEqual([]);
  });

  it('should load reflog successfully', async () => {
    mockGitService.getReflog.mockResolvedValue({
      success: true,
      data: [mockReflogEntry],
    });

    const { result } = renderHook(() => useGitHistory({ repoPath: mockRepoPath }));

    await act(async () => {
      await result.current.loadReflog();
    });

    expect(mockGitService.getReflog).toHaveBeenCalledWith(mockRepoPath, undefined);
    expect(result.current.reflog).toEqual([mockReflogEntry]);
  });

  it('should undo last operation successfully', async () => {
    mockGitService.undoLast.mockResolvedValue({ success: true });
    mockGitService.getHistory.mockResolvedValue([]);

    const { result } = renderHook(() => useGitHistory({ repoPath: mockRepoPath }));

    await act(async () => {
      const undoResult = await result.current.undoLast();
      expect(undoResult?.success).toBe(true);
    });

    expect(mockGitService.undoLast).toHaveBeenCalledWith(mockRepoPath);
    // Should reload history after undo
    expect(mockGitService.getHistory).toHaveBeenCalled();
  });

  it('should handle undo error', async () => {
    mockGitService.undoLast.mockResolvedValue({
      success: false,
      error: 'No undoable operation found',
    });

    const { result } = renderHook(() => useGitHistory({ repoPath: mockRepoPath }));

    await act(async () => {
      await result.current.undoLast();
    });

    expect(result.current.error).toBe('No undoable operation found');
  });

  it('should clear history successfully', async () => {
    mockGitService.clearHistory.mockResolvedValue(undefined);
    mockGitService.getHistory.mockResolvedValue([mockHistoryRecord]);

    const { result } = renderHook(() => useGitHistory({ repoPath: mockRepoPath }));

    // First load some history
    await act(async () => {
      await result.current.loadHistory();
    });

    expect(result.current.history).toHaveLength(1);

    // Then clear it
    await act(async () => {
      await result.current.clearHistory();
    });

    expect(mockGitService.clearHistory).toHaveBeenCalledWith(mockRepoPath);
    expect(result.current.history).toEqual([]);
  });

  it('should recover to reflog entry successfully', async () => {
    mockGitService.recoverToReflog.mockResolvedValue({ success: true });
    mockGitService.getReflog.mockResolvedValue({
      success: true,
      data: [],
    });

    const { result } = renderHook(() => useGitHistory({ repoPath: mockRepoPath }));

    await act(async () => {
      const recoverResult = await result.current.recoverToReflog('HEAD@{1}');
      expect(recoverResult?.success).toBe(true);
    });

    expect(mockGitService.recoverToReflog).toHaveBeenCalledWith(mockRepoPath, 'HEAD@{1}');
    // Should reload reflog after recovery
    expect(mockGitService.getReflog).toHaveBeenCalled();
  });

  it('should clear error', async () => {
    mockGitService.getHistory.mockRejectedValue(new Error('Test error'));

    const { result } = renderHook(() => useGitHistory({ repoPath: mockRepoPath }));

    await act(async () => {
      await result.current.loadHistory();
    });

    expect(result.current.error).toBe('Test error');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should not call API when repoPath is empty', async () => {
    const { result } = renderHook(() => useGitHistory({ repoPath: '' }));

    await act(async () => {
      await result.current.loadHistory();
      await result.current.loadReflog();
      await result.current.undoLast();
      await result.current.clearHistory();
      await result.current.recoverToReflog('HEAD@{0}');
    });

    expect(mockGitService.getHistory).not.toHaveBeenCalled();
    expect(mockGitService.getReflog).not.toHaveBeenCalled();
    expect(mockGitService.undoLast).not.toHaveBeenCalled();
    expect(mockGitService.clearHistory).not.toHaveBeenCalled();
    expect(mockGitService.recoverToReflog).not.toHaveBeenCalled();
  });
});
