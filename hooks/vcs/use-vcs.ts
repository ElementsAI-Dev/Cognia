/**
 * Multi-VCS Hook - React hook for version control system operations
 *
 * Supports: Git, Jujutsu (jj), Mercurial (hg), Subversion (svn)
 * Per agent-trace.dev specification section 6.4
 */

import { useState, useCallback } from 'react';
import {
  vcsService,
  type VcsType,
  type VcsInfo,
  type VcsStatus,
  type VcsBlameLineInfo,
  type VcsOperationResult,
} from '@/lib/native/vcs';

export interface UseVcsReturn {
  /** Whether VCS service is available (requires Tauri) */
  isAvailable: boolean;

  /** Currently detected VCS type */
  detectedVcs: VcsType | null;

  /** Current VCS info */
  vcsInfo: VcsInfo | null;

  /** Installed VCS tools */
  installedVcs: VcsStatus[];

  /** Loading state */
  isLoading: boolean;

  /** Error message */
  error: string | null;

  /** Detect VCS type for a path */
  detect: (path: string) => Promise<VcsType | null>;

  /** Get VCS info for a path */
  getInfo: (path: string) => Promise<VcsInfo | null>;

  /** Check installed VCS tools */
  checkInstalled: () => Promise<VcsStatus[]>;

  /** Get blame info for a file */
  blame: (
    repoPath: string,
    filePath: string,
    lineNumber?: number
  ) => Promise<VcsBlameLineInfo[]>;

  /** Get blame for a specific line */
  blameLine: (
    repoPath: string,
    filePath: string,
    lineNumber: number
  ) => Promise<VcsBlameLineInfo | null>;

  /** Clear error state */
  clearError: () => void;
}

/**
 * Hook for multi-VCS operations
 */
export function useVcs(): UseVcsReturn {
  const [detectedVcs, setDetectedVcs] = useState<VcsType | null>(null);
  const [vcsInfo, setVcsInfo] = useState<VcsInfo | null>(null);
  const [installedVcs, setInstalledVcs] = useState<VcsStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAvailable = vcsService.isAvailable();

  const detect = useCallback(async (path: string): Promise<VcsType | null> => {
    if (!isAvailable) {
      setError('VCS service not available');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result: VcsOperationResult<VcsType> = await vcsService.detect(path);
      if (result.success && result.data) {
        setDetectedVcs(result.data);
        return result.data;
      }
      if (result.error) {
        setError(result.error);
      }
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  const getInfo = useCallback(async (path: string): Promise<VcsInfo | null> => {
    if (!isAvailable) {
      setError('VCS service not available');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await vcsService.getInfo(path);
      if (result.success && result.data) {
        setVcsInfo(result.data);
        setDetectedVcs(result.data.vcsType);
        return result.data;
      }
      if (result.error) {
        setError(result.error);
      }
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  const checkInstalled = useCallback(async (): Promise<VcsStatus[]> => {
    if (!isAvailable) {
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await vcsService.checkInstalled();
      setInstalledVcs(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  const blame = useCallback(
    async (
      repoPath: string,
      filePath: string,
      lineNumber?: number
    ): Promise<VcsBlameLineInfo[]> => {
      if (!isAvailable) {
        setError('VCS service not available');
        return [];
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await vcsService.blame(repoPath, filePath, lineNumber);
        if (result.success && result.data) {
          return result.data;
        }
        if (result.error) {
          setError(result.error);
        }
        return [];
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [isAvailable]
  );

  const blameLine = useCallback(
    async (
      repoPath: string,
      filePath: string,
      lineNumber: number
    ): Promise<VcsBlameLineInfo | null> => {
      if (!isAvailable) {
        setError('VCS service not available');
        return null;
      }

      try {
        return await vcsService.blameLine(repoPath, filePath, lineNumber);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        return null;
      }
    },
    [isAvailable]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isAvailable,
    detectedVcs,
    vcsInfo,
    installedVcs,
    isLoading,
    error,
    detect,
    getInfo,
    checkInstalled,
    blame,
    blameLine,
    clearError,
  };
}

export default useVcs;
