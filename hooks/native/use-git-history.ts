/**
 * useGitHistory Hook - React hook for Git operation history and undo functionality
 *
 * Provides access to:
 * - Operation history tracking
 * - Undo last operation
 * - Git reflog for recovery
 */

import { useState, useCallback } from 'react';
import { gitService } from '@/lib/native/git';
import type { GitOperationRecord, GitReflogEntry, GitOperationResult } from '@/types/system/git';

export interface UseGitHistoryOptions {
  repoPath: string;
  autoLoad?: boolean;
}

export interface UseGitHistoryReturn {
  // State
  history: GitOperationRecord[];
  reflog: GitReflogEntry[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadHistory: (limit?: number) => Promise<void>;
  loadReflog: (maxCount?: number) => Promise<void>;
  undoLast: () => Promise<GitOperationResult<void> | null>;
  clearHistory: () => Promise<void>;
  recoverToReflog: (selector: string) => Promise<GitOperationResult<void> | null>;
  clearError: () => void;
}

export function useGitHistory(options: UseGitHistoryOptions): UseGitHistoryReturn {
  const { repoPath } = options;

  const [history, setHistory] = useState<GitOperationRecord[]>([]);
  const [reflog, setReflog] = useState<GitReflogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(
    async (limit?: number) => {
      if (!repoPath) return;

      setIsLoading(true);
      setError(null);

      try {
        const records = await gitService.getHistory(repoPath, limit);
        setHistory(records);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        console.error('Failed to load git history:', message);
      } finally {
        setIsLoading(false);
      }
    },
    [repoPath]
  );

  const loadReflog = useCallback(
    async (maxCount?: number) => {
      if (!repoPath) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await gitService.getReflog(repoPath, maxCount);
        if (result.success && result.data) {
          setReflog(result.data);
        } else if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        console.error('Failed to load git reflog:', message);
      } finally {
        setIsLoading(false);
      }
    },
    [repoPath]
  );

  const undoLast = useCallback(async () => {
    if (!repoPath) return null;

    setIsLoading(true);
    setError(null);

    try {
      const result = await gitService.undoLast(repoPath);
      if (result.success) {
        // Reload history after successful undo
        await loadHistory();
      } else if (result.error) {
        setError(result.error);
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error('Failed to undo last operation:', message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [repoPath, loadHistory]);

  const clearHistory = useCallback(async () => {
    if (!repoPath) return;

    setIsLoading(true);
    setError(null);

    try {
      await gitService.clearHistory(repoPath);
      setHistory([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error('Failed to clear git history:', message);
    } finally {
      setIsLoading(false);
    }
  }, [repoPath]);

  const recoverToReflog = useCallback(
    async (selector: string) => {
      if (!repoPath) return null;

      setIsLoading(true);
      setError(null);

      try {
        const result = await gitService.recoverToReflog(repoPath, selector);
        if (result.success) {
          // Reload reflog after successful recovery
          await loadReflog();
        } else if (result.error) {
          setError(result.error);
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        console.error('Failed to recover to reflog entry:', message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [repoPath, loadReflog]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    history,
    reflog,
    isLoading,
    error,

    // Actions
    loadHistory,
    loadReflog,
    undoLast,
    clearHistory,
    recoverToReflog,
    clearError,
  };
}

export default useGitHistory;
