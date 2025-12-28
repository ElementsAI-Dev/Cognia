/**
 * useSandboxDb - React hooks for sandbox database operations
 *
 * Provides convenient React hooks for interacting with the sandbox database,
 * including execution history, code snippets, sessions, and statistics.
 */

import { useCallback, useEffect, useState } from 'react';
import type {
  CodeSnippet,
  CreateSnippetRequest,
  DailyExecutionCount,
  ExecutionFilter,
  ExecutionRecord,
  ExecutionRequest,
  ExecutionResult,
  ExecutionSession,
  LanguageStats,
  SandboxStats,
  SnippetFilter,
} from '@/types/sandbox';

// Check if we're in Tauri environment
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

// Dynamic import for Tauri API
const getSandboxApi = async () => {
  if (!isTauri) {
    throw new Error('Sandbox API is only available in Tauri environment');
  }
  return import('@/lib/native/sandbox-db');
};

// ==================== Execution History Hook ====================

export interface UseExecutionHistoryOptions {
  filter?: ExecutionFilter;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseExecutionHistoryReturn {
  executions: ExecutionRecord[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deleteExecution: (id: string) => Promise<boolean>;
  toggleFavorite: (id: string) => Promise<boolean>;
  addTags: (id: string, tags: string[]) => Promise<void>;
  removeTags: (id: string, tags: string[]) => Promise<void>;
  clearHistory: (beforeDate?: string) => Promise<number>;
}

export function useExecutionHistory(
  options: UseExecutionHistoryOptions = {}
): UseExecutionHistoryReturn {
  const { filter = {}, autoRefresh = false, refreshInterval = 30000 } = options;
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isTauri) return;
    try {
      setLoading(true);
      setError(null);
      const api = await getSandboxApi();
      const result = await api.queryExecutions(filter);
      setExecutions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const deleteExecution = useCallback(async (id: string) => {
    if (!isTauri) return false;
    const api = await getSandboxApi();
    const success = await api.deleteExecution(id);
    if (success) {
      setExecutions((prev) => prev.filter((e) => e.id !== id));
    }
    return success;
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    if (!isTauri) return false;
    const api = await getSandboxApi();
    const isFavorite = await api.toggleExecutionFavorite(id);
    setExecutions((prev) =>
      prev.map((e) => (e.id === id ? { ...e, is_favorite: isFavorite } : e))
    );
    return isFavorite;
  }, []);

  const addTags = useCallback(async (id: string, tags: string[]) => {
    if (!isTauri) return;
    const api = await getSandboxApi();
    await api.addExecutionTags(id, tags);
    setExecutions((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, tags: [...new Set([...e.tags, ...tags])] } : e
      )
    );
  }, []);

  const removeTags = useCallback(async (id: string, tags: string[]) => {
    if (!isTauri) return;
    const api = await getSandboxApi();
    await api.removeExecutionTags(id, tags);
    setExecutions((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, tags: e.tags.filter((t) => !tags.includes(t)) } : e
      )
    );
  }, []);

  const clearHistory = useCallback(async (beforeDate?: string) => {
    if (!isTauri) return 0;
    const api = await getSandboxApi();
    const count = await api.clearExecutionHistory(beforeDate);
    await refresh();
    return count;
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh || !isTauri) return;
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  return {
    executions,
    loading,
    error,
    refresh,
    deleteExecution,
    toggleFavorite,
    addTags,
    removeTags,
    clearHistory,
  };
}

// ==================== Code Snippets Hook ====================

export interface UseSnippetsOptions {
  filter?: SnippetFilter;
}

export interface UseSnippetsReturn {
  snippets: CodeSnippet[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createSnippet: (request: CreateSnippetRequest) => Promise<CodeSnippet | null>;
  updateSnippet: (snippet: CodeSnippet) => Promise<void>;
  deleteSnippet: (id: string) => Promise<boolean>;
  executeSnippet: (id: string) => Promise<ExecutionResult | null>;
  createFromExecution: (
    executionId: string,
    title: string,
    description?: string,
    category?: string,
    isTemplate?: boolean
  ) => Promise<CodeSnippet | null>;
}

export function useSnippets(options: UseSnippetsOptions = {}): UseSnippetsReturn {
  const { filter = {} } = options;
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isTauri) return;
    try {
      setLoading(true);
      setError(null);
      const api = await getSandboxApi();
      const result = await api.querySnippets(filter);
      setSnippets(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const createSnippet = useCallback(async (request: CreateSnippetRequest) => {
    if (!isTauri) return null;
    try {
      const api = await getSandboxApi();
      const snippet = await api.createSnippet(request);
      setSnippets((prev) => [snippet, ...prev]);
      return snippet;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, []);

  const updateSnippet = useCallback(async (snippet: CodeSnippet) => {
    if (!isTauri) return;
    const api = await getSandboxApi();
    await api.updateSnippet(snippet);
    setSnippets((prev) => prev.map((s) => (s.id === snippet.id ? snippet : s)));
  }, []);

  const deleteSnippet = useCallback(async (id: string) => {
    if (!isTauri) return false;
    const api = await getSandboxApi();
    const success = await api.deleteSnippet(id);
    if (success) {
      setSnippets((prev) => prev.filter((s) => s.id !== id));
    }
    return success;
  }, []);

  const executeSnippet = useCallback(async (id: string) => {
    if (!isTauri) return null;
    try {
      const api = await getSandboxApi();
      return await api.executeSnippet(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, []);

  const createFromExecution = useCallback(
    async (
      executionId: string,
      title: string,
      description?: string,
      category?: string,
      isTemplate = false
    ) => {
      if (!isTauri) return null;
      try {
        const api = await getSandboxApi();
        const snippet = await api.createSnippetFromExecution(
          executionId,
          title,
          description,
          category,
          isTemplate
        );
        setSnippets((prev) => [snippet, ...prev]);
        return snippet;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      }
    },
    []
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    snippets,
    loading,
    error,
    refresh,
    createSnippet,
    updateSnippet,
    deleteSnippet,
    executeSnippet,
    createFromExecution,
  };
}

// ==================== Sessions Hook ====================

export interface UseSessionsOptions {
  activeOnly?: boolean;
}

export interface UseSessionsReturn {
  sessions: ExecutionSession[];
  currentSessionId: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  startSession: (name: string, description?: string) => Promise<ExecutionSession | null>;
  endSession: () => Promise<void>;
  setCurrentSession: (sessionId: string | null) => Promise<void>;
  deleteSession: (id: string, deleteExecutions?: boolean) => Promise<void>;
}

export function useSessions(options: UseSessionsOptions = {}): UseSessionsReturn {
  const { activeOnly = false } = options;
  const [sessions, setSessions] = useState<ExecutionSession[]>([]);
  const [currentSessionId, setCurrentSessionIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isTauri) return;
    try {
      setLoading(true);
      setError(null);
      const api = await getSandboxApi();
      const [sessionList, currentId] = await Promise.all([
        api.listSessions(activeOnly),
        api.getCurrentSession(),
      ]);
      setSessions(sessionList);
      setCurrentSessionIdState(currentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  const startSession = useCallback(async (name: string, description?: string) => {
    if (!isTauri) return null;
    try {
      const api = await getSandboxApi();
      const session = await api.startSession(name, description);
      setSessions((prev) => [session, ...prev]);
      setCurrentSessionIdState(session.id);
      return session;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, []);

  const endSession = useCallback(async () => {
    if (!isTauri) return;
    const api = await getSandboxApi();
    await api.endSession();
    setCurrentSessionIdState(null);
    await refresh();
  }, [refresh]);

  const setCurrentSession = useCallback(async (sessionId: string | null) => {
    if (!isTauri) return;
    const api = await getSandboxApi();
    await api.setCurrentSession(sessionId);
    setCurrentSessionIdState(sessionId);
  }, []);

  const deleteSession = useCallback(
    async (id: string, deleteExecutions = false) => {
      if (!isTauri) return;
      const api = await getSandboxApi();
      await api.deleteSession(id, deleteExecutions);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (currentSessionId === id) {
        setCurrentSessionIdState(null);
      }
    },
    [currentSessionId]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    sessions,
    currentSessionId,
    loading,
    error,
    refresh,
    startSession,
    endSession,
    setCurrentSession,
    deleteSession,
  };
}

// ==================== Statistics Hook ====================

export interface UseSandboxStatsReturn {
  stats: SandboxStats | null;
  languageStats: LanguageStats[];
  dailyCounts: DailyExecutionCount[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSandboxStats(days: number = 30): UseSandboxStatsReturn {
  const [stats, setStats] = useState<SandboxStats | null>(null);
  const [languageStats, setLanguageStats] = useState<LanguageStats[]>([]);
  const [dailyCounts, setDailyCounts] = useState<DailyExecutionCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isTauri) return;
    try {
      setLoading(true);
      setError(null);
      const api = await getSandboxApi();
      const [statsData, langStats, counts] = await Promise.all([
        api.getSandboxStats(),
        api.getAllLanguageStats(),
        api.getDailyExecutionCounts(days),
      ]);
      setStats(statsData);
      setLanguageStats(langStats);
      setDailyCounts(counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    stats,
    languageStats,
    dailyCounts,
    loading,
    error,
    refresh,
  };
}

// ==================== Code Execution Hook ====================

export interface UseCodeExecutionReturn {
  result: ExecutionResult | null;
  executing: boolean;
  error: string | null;
  execute: (request: ExecutionRequest) => Promise<ExecutionResult | null>;
  quickExecute: (language: string, code: string) => Promise<ExecutionResult | null>;
  reset: () => void;
}

export function useCodeExecution(): UseCodeExecutionReturn {
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (request: ExecutionRequest) => {
    if (!isTauri) return null;
    try {
      setExecuting(true);
      setError(null);
      const api = await getSandboxApi();
      const execResult = await api.executeCode(request);
      setResult(execResult);
      return execResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return null;
    } finally {
      setExecuting(false);
    }
  }, []);

  const quickExecute = useCallback(async (language: string, code: string) => {
    if (!isTauri) return null;
    try {
      setExecuting(true);
      setError(null);
      const api = await getSandboxApi();
      const execResult = await api.quickExecute(language, code);
      setResult(execResult);
      return execResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return null;
    } finally {
      setExecuting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    executing,
    error,
    execute,
    quickExecute,
    reset,
  };
}

// ==================== Tags & Categories Hook ====================

export interface UseTagsCategoriesReturn {
  tags: string[];
  categories: string[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useTagsCategories(): UseTagsCategoriesReturn {
  const [tags, setTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isTauri) return;
    try {
      setLoading(true);
      const api = await getSandboxApi();
      const [tagList, categoryList] = await Promise.all([
        api.getAllTags(),
        api.getAllCategories(),
      ]);
      setTags(tagList);
      setCategories(categoryList);
    } catch {
      // Ignore errors for tags/categories
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tags, categories, loading, refresh };
}
