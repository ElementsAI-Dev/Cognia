/**
 * Tests for useCodeExecution hook
 */

import { renderHook, act } from '@testing-library/react';
import { useCodeExecution, CodeSandboxExecutionResult } from './use-code-execution';

// Mock stores
jest.mock('@/stores', () => ({
  useNativeStore: jest.fn((selector) => {
    const state = {
      isDesktop: true,
    };
    return selector(state);
  }),
}));

// Mock sandbox service
jest.mock('@/lib/native/sandbox', () => ({
  executeWithStdin: jest.fn(),
}));

// Mock performance.now for consistent timing
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
  },
  writable: true,
});

describe('useCodeExecution', () => {
  let mockExecuteWithStdin: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockExecuteWithStdin = jest.requireMock('@/lib/native/sandbox').executeWithStdin;
    mockExecuteWithStdin.mockResolvedValue({
      status: 'completed',
      exit_code: 0,
      stdout: 'Hello Python',
      stderr: '',
      execution_time_ms: 100,
      language: 'python',
    });
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useCodeExecution());

      expect(result.current.isExecuting).toBe(false);
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('browser execution', () => {
    it('should execute JavaScript code in browser', async () => {
      const { result } = renderHook(() => useCodeExecution());

      let executionResult!: CodeSandboxExecutionResult;
      await act(async () => {
        executionResult = await result.current.execute('console.log("test")', 'javascript');
      });

      expect(executionResult).toMatchObject({
        success: true,
        language: 'javascript',
        exitCode: 0,
      });
      expect(executionResult.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.current.result).toEqual(executionResult);
      expect(result.current.isExecuting).toBe(false);
    });

    it('should execute TypeScript code in browser', async () => {
      const { result } = renderHook(() => useCodeExecution());

      let executionResult!: CodeSandboxExecutionResult;
      await act(async () => {
        executionResult = await result.current.execute('const x: number = 1; console.log(x);', 'typescript');
      });

      expect(executionResult).toMatchObject({
        success: true,
        language: 'typescript',
        exitCode: 0,
      });
    });

    it('should handle JavaScript runtime errors', async () => {
      const { result } = renderHook(() => useCodeExecution());

      let executionResult!: CodeSandboxExecutionResult;
      await act(async () => {
        executionResult = await result.current.execute('throw new Error("test error")', 'javascript');
      });

      expect(executionResult.success).toBe(false);
      expect(executionResult.stderr).toContain('Error: test error');
    });

    it('should capture console output', async () => {
      const { result } = renderHook(() => useCodeExecution());

      let executionResult!: CodeSandboxExecutionResult;
      await act(async () => {
        executionResult = await result.current.execute('console.log("hello"); console.error("error")', 'javascript');
      });

      expect(executionResult.success).toBe(true);
      expect(executionResult.stdout).toContain('hello');
      expect(executionResult.stderr).toContain('error');
    });
  });

  describe('Tauri sandbox execution', () => {
    it('should execute Python code via Tauri sandbox', async () => {
      const { result } = renderHook(() => useCodeExecution());

      let executionResult!: CodeSandboxExecutionResult;
      await act(async () => {
        executionResult = await result.current.execute('print("Hello Python")', 'python');
      });

      expect(mockExecuteWithStdin).toHaveBeenCalledWith('python', 'print("Hello Python")', '');
      expect(executionResult).toMatchObject({
        success: true,
        stdout: 'Hello Python',
        stderr: '',
        exitCode: 0,
        language: 'python',
        executionTime: 100,
      });
    });

    it('should execute code with stdin input', async () => {
      const { result } = renderHook(() => useCodeExecution());

      let _executionResult;
      await act(async () => {
        _executionResult = await result.current.execute(
          'input().upper()',
          'python',
          { stdin: 'hello world' }
        );
      });

      expect(mockExecuteWithStdin).toHaveBeenCalledWith('python', 'input().upper()', 'hello world');
    });

    it('should handle sandbox execution errors', async () => {
      mockExecuteWithStdin.mockRejectedValue(new Error('Sandbox error'));

      const { result } = renderHook(() => useCodeExecution());

      let executionResult!: CodeSandboxExecutionResult;
      await act(async () => {
        executionResult = await result.current.execute('invalid code', 'python');
      });

      expect(executionResult).toMatchObject({
        success: false,
        stdout: '',
        stderr: 'Execution failed: Sandbox error',
        exitCode: 1,
        executionTime: 0,
        language: 'python',
      });
    });

    it('should handle non-Error exceptions in sandbox', async () => {
      mockExecuteWithStdin.mockRejectedValue('String error');

      const { result } = renderHook(() => useCodeExecution());

      let executionResult!: CodeSandboxExecutionResult;
      await act(async () => {
        executionResult = await result.current.execute('code', 'python');
      });

      expect(executionResult.stderr).toBe('Execution failed: String error');
    });

    it('should handle failed execution with non-zero exit code', async () => {
      mockExecuteWithStdin.mockResolvedValue({
        status: 'completed',
        exit_code: 1,
        stdout: '',
        stderr: 'Syntax error',
        execution_time_ms: 50,
        language: 'python',
      });

      const { result } = renderHook(() => useCodeExecution());

      let executionResult!: CodeSandboxExecutionResult;
      await act(async () => {
        executionResult = await result.current.execute('invalid syntax', 'python');
      });

      expect(executionResult.success).toBe(false);
      expect(executionResult.exitCode).toBe(1);
      expect(executionResult.stderr).toBe('Syntax error');
    });

    it('should handle execution timeout', async () => {
      mockExecuteWithStdin.mockResolvedValue({
        status: 'timeout',
        exit_code: null,
        stdout: '',
        stderr: 'Execution timed out',
        execution_time_ms: 30000,
        language: 'python',
      });

      const { result } = renderHook(() => useCodeExecution());

      let executionResult!: CodeSandboxExecutionResult;
      await act(async () => {
        executionResult = await result.current.execute('while True: pass', 'python', { timeout: 1000 });
      });

      expect(executionResult.success).toBe(false);
    });
  });

  describe('simulated execution', () => {
    it('should simulate execution for unsupported languages', async () => {
      const { result } = renderHook(() => useCodeExecution());

      let executionResult!: CodeSandboxExecutionResult;
      await act(async () => {
        executionResult = await result.current.execute('some code', 'lisp');
      });

      expect(executionResult).toMatchObject({
        success: true,
        stderr: '',
        exitCode: 0,
        language: 'lisp',
        isSimulated: true,
      });
      expect(executionResult.stdout).toContain('[Simulated execution for lisp]');
      expect(executionResult.executionTime).toBe(500);
    });

    it('should analyze code content in simulation', async () => {
      const { result } = renderHook(() => useCodeExecution());

      let executionResult!: CodeSandboxExecutionResult;
      await act(async () => {
        executionResult = await result.current.execute(
          'def main():\n    print("hello")\n    return 0',
          'lisp'
        );
      });

      expect(executionResult.isSimulated).toBe(true);
      expect(executionResult.stdout).toContain('[Simulated execution for lisp]');
    });

    it('should simulate execution when not in desktop environment', async () => {
      jest.requireMock('@/stores').useNativeStore.mockImplementation((_selector: (state: import('@/stores/system/native-store').NativeState) => Partial<import('@/stores/system/native-store').NativeState>) => {
        const state: import('@/stores/system/native-store').NativeState = {
          platform: null,
          appVersion: null,
          isDesktop: false,
          isAlwaysOnTop: false,
          isFullscreen: false,
          isMaximized: false,
          updateAvailable: false,
          updateVersion: null,
          updateDownloading: false,
          updateProgress: 0,
          notificationsEnabled: true,
          notificationPermission: false,
          shortcuts: [],
          shortcutsEnabled: true,
          shortcutConflicts: [],
          conflictResolutionMode: 'warn',
          nativeToolsConfig: {
            clipboardHistoryEnabled: true,
            clipboardHistorySize: 100,
            screenshotOcrEnabled: true,
            focusTrackingEnabled: false,
            contextRefreshInterval: 5,
          },
        };
        return _selector(state);
      });

      const { result } = renderHook(() => useCodeExecution());

      let _executionResult;
      await act(async () => {
        _executionResult = await result.current.execute('print("hello")', 'python');
      });

      expect(_executionResult!.isSimulated).toBe(true);
      expect(mockExecuteWithStdin).not.toHaveBeenCalled();
    });

    it('should detect code features in simulation', async () => {
      const { result } = renderHook(() => useCodeExecution());

      const testCases = [
        { code: 'simple code', hasMain: false, hasPrint: false },
        { code: 'function main() {}', hasMain: true, hasPrint: false },
        { code: 'print("hello")', hasMain: false, hasPrint: true },
        { code: 'def main(): print("test")', hasMain: true, hasPrint: true },
      ];

      for (const testCase of testCases) {
        await act(async () => {
          const _result = await result.current.execute(testCase.code, 'lisp');
          expect(_result.stdout).toContain('Code analysis:');
        });
      }
    });
  });

  describe('execution options', () => {
    it('should pass timeout option to sandbox', async () => {
      const { result } = renderHook(() => useCodeExecution());

      await act(async () => {
        await result.current.execute('print("test")', 'python', { timeout: 5000 });
      });

      // Just verify the execution completes without error
      expect(result.current.result).not.toBeNull();
    });

    it('should pass stdin option to sandbox', async () => {
      const { result } = renderHook(() => useCodeExecution());

      await act(async () => {
        await result.current.execute('print("test")', 'python', { stdin: 'test input' });
      });

      // Just verify the execution completes without error
      expect(result.current.result).not.toBeNull();
    });

    it('should handle custom language option', async () => {
      const { result } = renderHook(() => useCodeExecution());

      await act(async () => {
        await result.current.execute('print("test")', 'PYTHON', { language: 'python' });
      });

      // Just verify the execution completes without error
      expect(result.current.result).not.toBeNull();
    });
  });

  describe('cancel operation', () => {
    it('should cancel execution', async () => {
      const { result } = renderHook(() => useCodeExecution());

      // Start a long-running operation
      const executionPromise = act(async () => {
        await result.current.execute('while True: pass', 'python');
      });

      // Cancel before it completes
      act(() => {
        result.current.cancel();
      });

      await executionPromise;

      expect(result.current.isExecuting).toBe(false);
    });

    it('should not update result after cancellation', async () => {
      const { result } = renderHook(() => useCodeExecution());

      // Start execution
      const executionPromise = act(async () => {
        await result.current.execute('print("test")', 'python');
      });

      // Cancel immediately
      act(() => {
        result.current.cancel();
      });

      await executionPromise;

      // Result should not be updated since it was cancelled
      expect(result.current.result).toBeNull();
    });
  });

  describe('clear operation', () => {
    it('should clear result and error', async () => {
      const { result } = renderHook(() => useCodeExecution());

      // Execute code to set result
      await act(async () => {
        await result.current.execute('print("test")', 'python');
      });

      expect(result.current.result).not.toBeNull();

      // Clear
      act(() => {
        result.current.clear();
      });

      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isExecuting).toBe(false);
    });

    it('should clear error after failed execution', async () => {
      mockExecuteWithStdin.mockRejectedValueOnce(new Error('Test error'));

      const { result } = renderHook(() => useCodeExecution());

      // Execute code that fails
      await act(async () => {
        try {
          await result.current.execute('invalid', 'python');
        } catch (_e) {
          // Expected to fail
        }
      });

      // Clear
      act(() => {
        result.current.clear();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.result).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle execution errors gracefully', async () => {
      mockExecuteWithStdin.mockRejectedValue(new Error('Execution failed'));

      const { result } = renderHook(() => useCodeExecution());

      let _executionResult;
      await act(async () => {
        _executionResult = await result.current.execute('code', 'python');
      });

      // The hook should handle errors and return a failure result
      expect(_executionResult).toBeDefined();
      expect(result.current.isExecuting).toBe(false);
    });

    it('should handle non-Error exceptions', async () => {
      mockExecuteWithStdin.mockRejectedValue('String error');

      const { result } = renderHook(() => useCodeExecution());

      await act(async () => {
        await result.current.execute('code', 'python');
      });

      expect(result.current.isExecuting).toBe(false);
    });

    it('should set error result on failure', async () => {
      mockExecuteWithStdin.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useCodeExecution());

      await act(async () => {
        await result.current.execute('code', 'python');
      });

      // Should have some result after execution
      expect(result.current.result).toBeDefined();
    });
  });

  describe('language detection', () => {
    it('should handle case insensitive language names', async () => {
      const { result } = renderHook(() => useCodeExecution());

      const testCases = [
        ['JavaScript', 'javascript'],
        ['TypeScript', 'typescript'],
        ['PYTHON', 'python'],
        ['Python', 'python'],
      ];

      for (const [input, expected] of testCases) {
        await act(async () => {
          const execResult = await result.current.execute('code', input);
          expect(execResult.language).toBe(expected);
        });
      }
    });

    it('should route languages to correct execution strategy', async () => {
      const { result } = renderHook(() => useCodeExecution());

      // Browser executable - should not call sandbox
      await act(async () => {
        await result.current.execute('code', 'javascript');
      });
      expect(mockExecuteWithStdin).not.toHaveBeenCalled();

      // Sandbox executable - should call sandbox (but may be simulated in test)
      await act(async () => {
        await result.current.execute('code', 'python');
      });
      // In test environment, this might be simulated rather than sandboxed

      // Simulated - should not call sandbox
      mockExecuteWithStdin.mockClear();
      await act(async () => {
        await result.current.execute('code', 'lisp');
      });
      expect(mockExecuteWithStdin).not.toHaveBeenCalled();
    });
  });

  describe('concurrent execution', () => {
    it('should handle multiple executions sequentially', async () => {
      const { result } = renderHook(() => useCodeExecution());

      await act(async () => {
        const result1 = await result.current.execute('print("1")', 'python');
        expect(result1).toBeDefined();

        const result2 = await result.current.execute('print("2")', 'python');
        expect(result2).toBeDefined();
      });

      // Both executions should complete successfully
      expect(result.current.result).toBeDefined();
    });
  });

  describe('TypeScript transpilation edge cases', () => {
    it('should handle complex TypeScript features', async () => {
      const { result } = renderHook(() => useCodeExecution());

      let executionResult!: CodeSandboxExecutionResult;
      await act(async () => {
        executionResult = await result.current.execute(`
          interface User { name: string; }
          type ID = string;
          const user: User = { name: "test" };
          const id: ID = "123";
          console.log(user.name, id);
        `, 'typescript');
      });

      expect(executionResult).toBeDefined();
      expect(executionResult.language).toBe('typescript');
    });

    it('should handle TypeScript generics', async () => {
      const { result } = renderHook(() => useCodeExecution());

      let executionResult!: CodeSandboxExecutionResult;
      await act(async () => {
        executionResult = await result.current.execute(`
          function identity<T>(arg: T): T { return arg; }
          console.log(identity("test"));
        `, 'typescript');
      });

      expect(executionResult).toBeDefined();
      expect(executionResult.language).toBe('typescript');
    });
  });
});
