/**
 * React hook for AI code blame / attribution.
 * Queries agent trace data to determine which lines were written by AI vs human.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getFileBlame,
  getFileBlameStats,
  type BlameLineInfo,
  type FileBlameStats,
} from '@/lib/agent-trace/blame-provider';

export interface UseBlameOptions {
  filePath?: string;
  totalLines?: number;
  enabled?: boolean;
}

export interface UseBlameReturn {
  lines: BlameLineInfo[];
  stats: FileBlameStats | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useBlame(options: UseBlameOptions = {}): UseBlameReturn {
  const { filePath, totalLines = 0, enabled = true } = options;

  const [lines, setLines] = useState<BlameLineInfo[]>([]);
  const [stats, setStats] = useState<FileBlameStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!filePath || totalLines <= 0 || !enabled) return;
    if (!mountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const [blameLines, blameStats] = await Promise.all([
        getFileBlame(filePath, totalLines),
        getFileBlameStats(filePath, totalLines),
      ]);

      if (!mountedRef.current) return;
      setLines(blameLines);
      setStats(blameStats);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load blame data');
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [filePath, totalLines, enabled]);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  return { lines, stats, isLoading, error, refresh };
}
