/**
 * Tests for use-sandbox-db hooks
 *
 * These tests verify hook structure and behavior without Tauri.
 * The hooks gracefully handle non-Tauri environments by returning empty data.
 */

import { renderHook, act } from '@testing-library/react';
import {
  useExecutionHistory,
  useSnippets,
  useSessions,
  useSandboxStats,
  useCodeExecution,
  useTagsCategories,
} from './use-sandbox-db';

describe('useExecutionHistory', () => {
  it('should initialize with empty executions in non-Tauri environment', () => {
    const { result } = renderHook(() => useExecutionHistory());

    expect(result.current.executions).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should provide all required functions', () => {
    const { result } = renderHook(() => useExecutionHistory());

    expect(typeof result.current.refresh).toBe('function');
    expect(typeof result.current.deleteExecution).toBe('function');
    expect(typeof result.current.toggleFavorite).toBe('function');
    expect(typeof result.current.addTags).toBe('function');
    expect(typeof result.current.removeTags).toBe('function');
    expect(typeof result.current.clearHistory).toBe('function');
  });

  it('should accept filter options', () => {
    const { result } = renderHook(() =>
      useExecutionHistory({
        filter: { language: 'python', is_favorite: true },
      })
    );

    expect(result.current.executions).toEqual([]);
  });

  it('should handle autoRefresh option', () => {
    const { result } = renderHook(() =>
      useExecutionHistory({
        autoRefresh: true,
        refreshInterval: 5000,
      })
    );

    expect(result.current.executions).toEqual([]);
  });
});

describe('useSnippets', () => {
  it('should initialize with empty snippets in non-Tauri environment', () => {
    const { result } = renderHook(() => useSnippets());

    expect(result.current.snippets).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should provide all required functions', () => {
    const { result } = renderHook(() => useSnippets());

    expect(typeof result.current.refresh).toBe('function');
    expect(typeof result.current.createSnippet).toBe('function');
    expect(typeof result.current.updateSnippet).toBe('function');
    expect(typeof result.current.deleteSnippet).toBe('function');
    expect(typeof result.current.executeSnippet).toBe('function');
    expect(typeof result.current.createFromExecution).toBe('function');
  });

  it('should accept filter options', () => {
    const { result } = renderHook(() =>
      useSnippets({
        filter: { language: 'python', is_template: true },
      })
    );

    expect(result.current.snippets).toEqual([]);
  });
});

describe('useSessions', () => {
  it('should initialize with empty sessions in non-Tauri environment', () => {
    const { result } = renderHook(() => useSessions());

    expect(result.current.sessions).toEqual([]);
    expect(result.current.currentSessionId).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should provide all required functions', () => {
    const { result } = renderHook(() => useSessions());

    expect(typeof result.current.refresh).toBe('function');
    expect(typeof result.current.startSession).toBe('function');
    expect(typeof result.current.endSession).toBe('function');
    expect(typeof result.current.setCurrentSession).toBe('function');
    expect(typeof result.current.deleteSession).toBe('function');
  });

  it('should accept activeOnly option', () => {
    const { result } = renderHook(() => useSessions({ activeOnly: true }));

    expect(result.current.sessions).toEqual([]);
  });
});

describe('useSandboxStats', () => {
  it('should initialize with null stats in non-Tauri environment', () => {
    const { result } = renderHook(() => useSandboxStats());

    expect(result.current.stats).toBeNull();
    expect(result.current.languageStats).toEqual([]);
    expect(result.current.dailyCounts).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should provide refresh function', () => {
    const { result } = renderHook(() => useSandboxStats());

    expect(typeof result.current.refresh).toBe('function');
  });

  it('should accept days parameter', () => {
    const { result } = renderHook(() => useSandboxStats(14));

    expect(result.current.stats).toBeNull();
  });
});

describe('useCodeExecution', () => {
  it('should initialize with null result', () => {
    const { result } = renderHook(() => useCodeExecution());

    expect(result.current.result).toBeNull();
    expect(result.current.executing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should provide execute functions', () => {
    const { result } = renderHook(() => useCodeExecution());

    expect(typeof result.current.execute).toBe('function');
    expect(typeof result.current.quickExecute).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('should reset state when reset is called', () => {
    const { result } = renderHook(() => useCodeExecution());

    act(() => {
      result.current.reset();
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return null when executing in non-Tauri environment', async () => {
    const { result } = renderHook(() => useCodeExecution());

    let execResult: unknown;
    await act(async () => {
      execResult = await result.current.execute({
        language: 'python',
        code: 'print("test")',
      });
    });

    expect(execResult).toBeNull();
  });

  it('should return null for quickExecute in non-Tauri environment', async () => {
    const { result } = renderHook(() => useCodeExecution());

    let execResult: unknown;
    await act(async () => {
      execResult = await result.current.quickExecute('python', 'print("test")');
    });

    expect(execResult).toBeNull();
  });
});

describe('useTagsCategories', () => {
  it('should initialize with empty arrays in non-Tauri environment', () => {
    const { result } = renderHook(() => useTagsCategories());

    expect(result.current.tags).toEqual([]);
    expect(result.current.categories).toEqual([]);
  });

  it('should provide refresh function', () => {
    const { result } = renderHook(() => useTagsCategories());

    expect(typeof result.current.refresh).toBe('function');
  });
});
