/**
 * Sandbox Store Tests
 */

import { act, renderHook } from '@testing-library/react';
import {
  useSandboxStore,
  selectIsExecuting,
  selectLastResult,
  selectExecutionError,
  selectSandboxConfig,
  selectAvailableRuntimes,
  selectSupportedLanguages,
  selectRecentExecutions,
  selectSnippets,
  selectCurrentSession,
  selectSandboxStats,
  selectSelectedLanguage,
  selectEditorCode,
} from './sandbox-store';
import type {
  SandboxExecutionResult,
  SandboxExecutionRecord,
  CodeSnippet,
  ExecutionSession,
  SandboxStats,
  BackendSandboxConfig,
} from '@/types/system/sandbox';

describe('useSandboxStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useSandboxStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Availability and Configuration', () => {
    it('should set availability', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.setAvailable(true);
      });

      expect(result.current.isAvailable).toBe(true);
    });

    it('should set loading state', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set config', () => {
      const { result } = renderHook(() => useSandboxStore());
      const config: BackendSandboxConfig = {
        preferred_runtime: 'docker',
        enable_docker: true,
        enable_podman: false,
        enable_native: false,
        default_timeout_secs: 30,
        default_memory_limit_mb: 256,
        default_cpu_limit_percent: 50,
        max_output_size: 1024 * 1024,
        custom_images: {},
        network_enabled: false,
        workspace_dir: null,
        enabled_languages: ['python', 'javascript'],
      };

      act(() => {
        result.current.setConfig(config);
      });

      expect(result.current.config).toEqual(config);
    });

    it('should set runtimes', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.setRuntimes(['docker', 'native']);
      });

      expect(result.current.availableRuntimes).toEqual(['docker', 'native']);
    });

    it('should set languages', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.setLanguages(['python', 'javascript', 'rust']);
      });

      expect(result.current.supportedLanguages).toEqual(['python', 'javascript', 'rust']);
    });
  });

  describe('Execution State', () => {
    it('should start execution', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.startExecution('exec-123');
      });

      expect(result.current.execution.isExecuting).toBe(true);
      expect(result.current.execution.currentExecutionId).toBe('exec-123');
      expect(result.current.execution.error).toBeNull();
    });

    it('should complete execution', () => {
      const { result } = renderHook(() => useSandboxStore());
      const executionResult: SandboxExecutionResult = {
        id: 'exec-123',
        language: 'python',
        status: 'completed',
        stdout: 'Hello, World!',
        stderr: '',
        exit_code: 0,
        execution_time_ms: 150,
        runtime: 'docker',
        memory_used_bytes: null,
        error: null,
      };

      act(() => {
        result.current.startExecution('exec-123');
        result.current.completeExecution(executionResult);
      });

      expect(result.current.execution.isExecuting).toBe(false);
      expect(result.current.execution.lastResult).toEqual(executionResult);
      expect(result.current.execution.error).toBeNull();
    });

    it('should fail execution', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.startExecution('exec-123');
        result.current.failExecution('Docker not available');
      });

      expect(result.current.execution.isExecuting).toBe(false);
      expect(result.current.execution.error).toBe('Docker not available');
    });

    it('should reset execution', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.startExecution('exec-123');
        result.current.resetExecution();
      });

      expect(result.current.execution.isExecuting).toBe(false);
      expect(result.current.execution.currentExecutionId).toBeNull();
      expect(result.current.execution.lastResult).toBeNull();
      expect(result.current.execution.error).toBeNull();
    });
  });

  describe('History Management', () => {
    const mockExecution: SandboxExecutionRecord = {
      id: 'exec-1',
      session_id: null,
      language: 'python',
      code: 'print("hello")',
      stdin: null,
      stdout: 'hello',
      stderr: '',
      exit_code: 0,
      status: 'completed',
      execution_time_ms: 100,
      runtime: 'docker',
      memory_used_bytes: null,
      error: null,
      created_at: new Date().toISOString(),
      is_favorite: false,
      tags: [],
    };

    it('should set recent executions', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.setRecentExecutions([mockExecution]);
      });

      expect(result.current.recentExecutions).toHaveLength(1);
      expect(result.current.recentExecutions[0]).toEqual(mockExecution);
    });

    it('should add execution to beginning', () => {
      const { result } = renderHook(() => useSandboxStore());
      const newExecution = { ...mockExecution, id: 'exec-2' };

      act(() => {
        result.current.setRecentExecutions([mockExecution]);
        result.current.addExecution(newExecution);
      });

      expect(result.current.recentExecutions).toHaveLength(2);
      expect(result.current.recentExecutions[0].id).toBe('exec-2');
    });

    it('should limit history to 50 items', () => {
      const { result } = renderHook(() => useSandboxStore());
      const executions = Array.from({ length: 50 }, (_, i) => ({
        ...mockExecution,
        id: `exec-${i}`,
      }));

      act(() => {
        result.current.setRecentExecutions(executions);
        result.current.addExecution({ ...mockExecution, id: 'exec-new' });
      });

      expect(result.current.recentExecutions).toHaveLength(50);
      expect(result.current.recentExecutions[0].id).toBe('exec-new');
    });

    it('should remove execution', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.setRecentExecutions([mockExecution]);
        result.current.removeExecution('exec-1');
      });

      expect(result.current.recentExecutions).toHaveLength(0);
    });
  });

  describe('Snippets Management', () => {
    const mockSnippet: CodeSnippet = {
      id: 'snippet-1',
      title: 'Hello World',
      description: 'A simple hello world',
      language: 'python',
      code: 'print("Hello, World!")',
      tags: ['example'],
      category: 'basics',
      is_template: false,
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('should set snippets', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.setSnippets([mockSnippet]);
      });

      expect(result.current.snippets).toHaveLength(1);
    });

    it('should add snippet', () => {
      const { result } = renderHook(() => useSandboxStore());
      const newSnippet = { ...mockSnippet, id: 'snippet-2' };

      act(() => {
        result.current.setSnippets([mockSnippet]);
        result.current.addSnippet(newSnippet);
      });

      expect(result.current.snippets).toHaveLength(2);
      expect(result.current.snippets[0].id).toBe('snippet-2');
    });

    it('should update snippet', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.setSnippets([mockSnippet]);
        result.current.updateSnippet('snippet-1', { title: 'Updated Title' });
      });

      expect(result.current.snippets[0].title).toBe('Updated Title');
    });

    it('should remove snippet', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.setSnippets([mockSnippet]);
        result.current.removeSnippet('snippet-1');
      });

      expect(result.current.snippets).toHaveLength(0);
    });
  });

  describe('Session Management', () => {
    const mockSession: ExecutionSession = {
      id: 'session-1',
      name: 'Test Session',
      description: 'A test session',
      execution_count: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
    };

    it('should set current session', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.setCurrentSession(mockSession);
      });

      expect(result.current.currentSession).toEqual(mockSession);
    });

    it('should set sessions', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.setSessions([mockSession]);
      });

      expect(result.current.sessions).toHaveLength(1);
    });

    it('should add session', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.addSession(mockSession);
      });

      expect(result.current.sessions).toHaveLength(1);
    });

    it('should remove session and clear current if matching', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.setSessions([mockSession]);
        result.current.setCurrentSession(mockSession);
        result.current.removeSession('session-1');
      });

      expect(result.current.sessions).toHaveLength(0);
      expect(result.current.currentSession).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should set stats', () => {
      const { result } = renderHook(() => useSandboxStore());
      const stats: SandboxStats = {
        total_executions: 100,
        successful_executions: 90,
        failed_executions: 10,
        timeout_executions: 0,
        total_execution_time_ms: 50000,
        avg_execution_time_ms: 500,
        total_snippets: 5,
        total_sessions: 2,
        most_used_language: 'python',
        languages: [],
      };

      act(() => {
        result.current.setStats(stats);
      });

      expect(result.current.stats).toEqual(stats);
    });

    it('should set language stats', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.setLanguageStats('python', {
          language: 'python',
          total_executions: 50,
          successful_executions: 45,
          failed_executions: 5,
          timeout_executions: 0,
          total_execution_time_ms: 10000,
          avg_execution_time_ms: 200,
          total_memory_used_bytes: 0,
          last_used: null,
        });
      });

      expect(result.current.languageStats['python']).toBeDefined();
      expect(result.current.languageStats['python'].total_executions).toBe(50);
    });
  });

  describe('UI State', () => {
    it('should set selected language', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.setSelectedLanguage('rust');
      });

      expect(result.current.selectedLanguage).toBe('rust');
    });

    it('should set editor code', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.setEditorCode('fn main() {}');
      });

      expect(result.current.editorCode).toBe('fn main() {}');
    });
  });

  describe('Error Handling', () => {
    it('should set error', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.setError('Something went wrong');
      });

      expect(result.current.lastError).toBe('Something went wrong');
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.setError('Error');
        result.current.clearError();
      });

      expect(result.current.lastError).toBeNull();
    });
  });

  describe('Selectors', () => {
    it('should select isExecuting', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.startExecution('exec-1');
      });

      expect(selectIsExecuting(result.current)).toBe(true);
    });

    it('should select lastResult', () => {
      const { result } = renderHook(() => useSandboxStore());
      const mockResult: SandboxExecutionResult = {
        id: 'exec-1',
        language: 'python',
        status: 'completed',
        stdout: 'test',
        stderr: '',
        exit_code: 0,
        execution_time_ms: 100,
        runtime: 'docker',
        memory_used_bytes: null,
        error: null,
      };

      act(() => {
        result.current.completeExecution(mockResult);
      });

      expect(selectLastResult(result.current)).toEqual(mockResult);
    });

    it('should select executionError', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.failExecution('Test error');
      });

      expect(selectExecutionError(result.current)).toBe('Test error');
    });

    it('should select sandboxConfig', () => {
      const { result } = renderHook(() => useSandboxStore());
      expect(selectSandboxConfig(result.current)).toBeNull();
    });

    it('should select availableRuntimes', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.setRuntimes(['docker']);
      });

      expect(selectAvailableRuntimes(result.current)).toEqual(['docker']);
    });

    it('should select supportedLanguages', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.setLanguages(['python']);
      });

      expect(selectSupportedLanguages(result.current)).toEqual(['python']);
    });

    it('should select recentExecutions', () => {
      const { result } = renderHook(() => useSandboxStore());
      expect(selectRecentExecutions(result.current)).toEqual([]);
    });

    it('should select snippets', () => {
      const { result } = renderHook(() => useSandboxStore());
      expect(selectSnippets(result.current)).toEqual([]);
    });

    it('should select currentSession', () => {
      const { result } = renderHook(() => useSandboxStore());
      expect(selectCurrentSession(result.current)).toBeNull();
    });

    it('should select sandboxStats', () => {
      const { result } = renderHook(() => useSandboxStore());
      expect(selectSandboxStats(result.current)).toBeNull();
    });

    it('should select selectedLanguage', () => {
      const { result } = renderHook(() => useSandboxStore());
      expect(selectSelectedLanguage(result.current)).toBe('python');
    });

    it('should select editorCode', () => {
      const { result } = renderHook(() => useSandboxStore());
      expect(selectEditorCode(result.current)).toBe('');
    });
  });

  describe('Reset', () => {
    it('should reset to initial state', () => {
      const { result } = renderHook(() => useSandboxStore());

      act(() => {
        result.current.setAvailable(true);
        result.current.setSelectedLanguage('rust');
        result.current.setEditorCode('code');
        result.current.reset();
      });

      expect(result.current.isAvailable).toBe(false);
      expect(result.current.selectedLanguage).toBe('python');
      expect(result.current.editorCode).toBe('');
    });
  });
});
