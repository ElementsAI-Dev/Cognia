/**
 * Environment Service Tests
 * 
 * Tests for Python execution and virtual environment management functions.
 */

import type {
  PythonSandboxExecutionResult,
  PythonExecutionProgress,
  PythonExecutionOptions,
  PythonInterpreterInfo,
} from '@/types/system/environment';

// Mock Tauri API
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn(),
}));

jest.mock('./utils', () => ({
  isTauri: jest.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { isTauri } from './utils';
import {
  executePython,
  executePythonStream,
  executePythonFile,
  getPythonInfo,
  onPythonExecutionOutput,
  generateExecutionId,
  virtualEnvService,
} from './environment';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;
const mockListen = listen as jest.MockedFunction<typeof listen>;
const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;

describe('Environment Service - Python Execution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executePython', () => {
    it('should throw error when not in Tauri environment', async () => {
      mockIsTauri.mockReturnValue(false);

      await expect(
        executePython('/path/to/env', 'print("hello")')
      ).rejects.toThrow('Python execution requires Tauri environment');
    });

    it('should call invoke with correct parameters', async () => {
      mockIsTauri.mockReturnValue(true);
      const mockResult: PythonSandboxExecutionResult = {
        id: 'exec-123',
        status: 'completed',
        stdout: 'hello\n',
        stderr: '',
        exitCode: 0,
        executionTimeMs: 100,
        error: null,
        envPath: '/path/to/env',
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await executePython('/path/to/env', 'print("hello")');

      expect(mockInvoke).toHaveBeenCalledWith('environment_execute_python', {
        envPath: '/path/to/env',
        code: 'print("hello")',
        options: undefined,
      });
      expect(result).toEqual(mockResult);
    });

    it('should pass options correctly', async () => {
      mockIsTauri.mockReturnValue(true);
      const options: PythonExecutionOptions = {
        stdin: 'input data',
        timeoutSecs: 60,
        cwd: '/working/dir',
      };
      mockInvoke.mockResolvedValue({} as PythonSandboxExecutionResult);

      await executePython('/path/to/env', 'code', options);

      expect(mockInvoke).toHaveBeenCalledWith('environment_execute_python', {
        envPath: '/path/to/env',
        code: 'code',
        options,
      });
    });

    it('should handle execution errors', async () => {
      mockIsTauri.mockReturnValue(true);
      const mockResult: PythonSandboxExecutionResult = {
        id: 'exec-456',
        status: 'failed',
        stdout: '',
        stderr: 'SyntaxError: invalid syntax',
        exitCode: 1,
        executionTimeMs: 50,
        error: 'Execution failed',
        envPath: '/path/to/env',
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await executePython('/path/to/env', 'invalid code');

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Execution failed');
    });

    it('should handle timeout', async () => {
      mockIsTauri.mockReturnValue(true);
      const mockResult: PythonSandboxExecutionResult = {
        id: 'exec-789',
        status: 'timeout',
        stdout: '',
        stderr: '',
        exitCode: null,
        executionTimeMs: 30000,
        error: 'Execution timed out',
        envPath: '/path/to/env',
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await executePython('/path/to/env', 'import time; time.sleep(100)');

      expect(result.status).toBe('timeout');
    });
  });

  describe('executePythonStream', () => {
    it('should throw error when not in Tauri environment', async () => {
      mockIsTauri.mockReturnValue(false);

      await expect(
        executePythonStream('/path/to/env', 'code', 'exec-id')
      ).rejects.toThrow('Python execution requires Tauri environment');
    });

    it('should call invoke with correct parameters', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue(undefined);

      await executePythonStream('/path/to/env', 'print("hello")', 'exec-123');

      expect(mockInvoke).toHaveBeenCalledWith('environment_execute_python_stream', {
        envPath: '/path/to/env',
        code: 'print("hello")',
        executionId: 'exec-123',
        options: undefined,
      });
    });

    it('should pass options correctly', async () => {
      mockIsTauri.mockReturnValue(true);
      const options: PythonExecutionOptions = {
        timeoutSecs: 120,
      };
      mockInvoke.mockResolvedValue(undefined);

      await executePythonStream('/path/to/env', 'code', 'exec-id', options);

      expect(mockInvoke).toHaveBeenCalledWith('environment_execute_python_stream', {
        envPath: '/path/to/env',
        code: 'code',
        executionId: 'exec-id',
        options,
      });
    });
  });

  describe('executePythonFile', () => {
    it('should throw error when not in Tauri environment', async () => {
      mockIsTauri.mockReturnValue(false);

      await expect(
        executePythonFile('/path/to/env', '/path/to/script.py')
      ).rejects.toThrow('Python execution requires Tauri environment');
    });

    it('should call invoke with correct parameters', async () => {
      mockIsTauri.mockReturnValue(true);
      const mockResult: PythonSandboxExecutionResult = {
        id: 'exec-file-123',
        status: 'completed',
        stdout: 'Script output',
        stderr: '',
        exitCode: 0,
        executionTimeMs: 200,
        error: null,
        envPath: '/path/to/env',
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await executePythonFile('/path/to/env', '/path/to/script.py');

      expect(mockInvoke).toHaveBeenCalledWith('environment_execute_python_file', {
        envPath: '/path/to/env',
        filePath: '/path/to/script.py',
        options: undefined,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('getPythonInfo', () => {
    it('should throw error when not in Tauri environment', async () => {
      mockIsTauri.mockReturnValue(false);

      await expect(getPythonInfo('/path/to/env')).rejects.toThrow(
        'Python info requires Tauri environment'
      );
    });

    it('should call invoke with correct parameters', async () => {
      mockIsTauri.mockReturnValue(true);
      const mockInfo: PythonInterpreterInfo = {
        version: '3.12.0',
        executable: '/path/to/env/bin/python',
        envPath: '/path/to/env',
        sysPath: ['/path/to/env/lib/python3.12'],
        platform: 'Linux-5.15.0-x86_64',
      };
      mockInvoke.mockResolvedValue(mockInfo);

      const result = await getPythonInfo('/path/to/env');

      expect(mockInvoke).toHaveBeenCalledWith('environment_get_python_info', {
        envPath: '/path/to/env',
      });
      expect(result).toEqual(mockInfo);
    });
  });

  describe('onPythonExecutionOutput', () => {
    it('should return no-op function when not in Tauri environment', async () => {
      mockIsTauri.mockReturnValue(false);

      const unlisten = await onPythonExecutionOutput(() => {});

      expect(unlisten).toBeInstanceOf(Function);
      expect(mockListen).not.toHaveBeenCalled();
    });

    it('should set up event listener when in Tauri environment', async () => {
      mockIsTauri.mockReturnValue(true);
      const mockUnlisten = jest.fn();
      mockListen.mockResolvedValue(mockUnlisten);
      const callback = jest.fn();

      await onPythonExecutionOutput(callback);

      expect(mockListen).toHaveBeenCalledWith(
        'python-execution-output',
        expect.any(Function)
      );
    });

    it('should call callback with event payload', async () => {
      mockIsTauri.mockReturnValue(true);
      const mockUnlisten = jest.fn();
      let capturedHandler: ((event: { payload: PythonExecutionProgress }) => void) | null = null;
      mockListen.mockImplementation((_, handler) => {
        capturedHandler = handler as (event: { payload: PythonExecutionProgress }) => void;
        return Promise.resolve(mockUnlisten);
      });
      const callback = jest.fn();

      await onPythonExecutionOutput(callback);

      const mockProgress: PythonExecutionProgress = {
        id: 'exec-123',
        outputType: 'stdout',
        content: 'test output',
        done: false,
        exitCode: null,
      };

      capturedHandler!({ payload: mockProgress });

      expect(callback).toHaveBeenCalledWith(mockProgress);
    });
  });

  describe('generateExecutionId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateExecutionId();
      const id2 = generateExecutionId();

      expect(id1).not.toBe(id2);
    });

    it('should start with exec- prefix', () => {
      const id = generateExecutionId();

      expect(id).toMatch(/^exec-/);
    });

    it('should contain timestamp-like number', () => {
      const id = generateExecutionId();
      const parts = id.split('-');

      expect(parts.length).toBeGreaterThanOrEqual(2);
      expect(parseInt(parts[1])).toBeGreaterThan(0);
    });
  });

  describe('virtualEnvService', () => {
    it('should expose executePython function', () => {
      expect(virtualEnvService.executePython).toBe(executePython);
    });

    it('should expose executePythonStream function', () => {
      expect(virtualEnvService.executePythonStream).toBe(executePythonStream);
    });

    it('should expose executePythonFile function', () => {
      expect(virtualEnvService.executePythonFile).toBe(executePythonFile);
    });

    it('should expose getPythonInfo function', () => {
      expect(virtualEnvService.getPythonInfo).toBe(getPythonInfo);
    });

    it('should expose onPythonExecutionOutput function', () => {
      expect(virtualEnvService.onPythonExecutionOutput).toBe(onPythonExecutionOutput);
    });

    it('should expose generateExecutionId function', () => {
      expect(virtualEnvService.generateExecutionId).toBe(generateExecutionId);
    });
  });
});

describe('Environment Types', () => {
  describe('PythonSandboxExecutionResult', () => {
    it('should have correct structure for successful execution', () => {
      const result: PythonSandboxExecutionResult = {
        id: 'test-id',
        status: 'completed',
        stdout: 'output',
        stderr: '',
        exitCode: 0,
        executionTimeMs: 100,
        error: null,
        envPath: '/env',
      };

      expect(result.status).toBe('completed');
      expect(result.exitCode).toBe(0);
      expect(result.error).toBeNull();
    });

    it('should have correct structure for failed execution', () => {
      const result: PythonSandboxExecutionResult = {
        id: 'test-id',
        status: 'failed',
        stdout: '',
        stderr: 'error message',
        exitCode: 1,
        executionTimeMs: 50,
        error: 'Execution failed',
        envPath: '/env',
      };

      expect(result.status).toBe('failed');
      expect(result.exitCode).toBe(1);
      expect(result.error).not.toBeNull();
    });

    it('should have correct structure for timeout', () => {
      const result: PythonSandboxExecutionResult = {
        id: 'test-id',
        status: 'timeout',
        stdout: 'partial',
        stderr: '',
        exitCode: null,
        executionTimeMs: 30000,
        error: 'Timed out',
        envPath: '/env',
      };

      expect(result.status).toBe('timeout');
      expect(result.exitCode).toBeNull();
    });
  });

  describe('PythonExecutionProgress', () => {
    it('should have correct structure for stdout', () => {
      const progress: PythonExecutionProgress = {
        id: 'exec-id',
        outputType: 'stdout',
        content: 'line output',
        done: false,
        exitCode: null,
      };

      expect(progress.outputType).toBe('stdout');
      expect(progress.done).toBe(false);
    });

    it('should have correct structure for completion', () => {
      const progress: PythonExecutionProgress = {
        id: 'exec-id',
        outputType: 'status',
        content: 'Completed',
        done: true,
        exitCode: 0,
      };

      expect(progress.done).toBe(true);
      expect(progress.exitCode).toBe(0);
    });
  });

  describe('PythonExecutionOptions', () => {
    it('should allow all optional fields', () => {
      const options: PythonExecutionOptions = {};

      expect(options.stdin).toBeUndefined();
      expect(options.timeoutSecs).toBeUndefined();
      expect(options.cwd).toBeUndefined();
    });

    it('should allow setting all fields', () => {
      const options: PythonExecutionOptions = {
        stdin: 'input',
        timeoutSecs: 60,
        cwd: '/working/dir',
        env: { KEY: 'value' },
        args: ['--verbose'],
      };

      expect(options.stdin).toBe('input');
      expect(options.timeoutSecs).toBe(60);
      expect(options.args).toContain('--verbose');
    });
  });

  describe('PythonInterpreterInfo', () => {
    it('should have correct structure', () => {
      const info: PythonInterpreterInfo = {
        version: '3.11.0',
        executable: '/path/to/python',
        envPath: '/path/to/env',
        sysPath: ['/lib1', '/lib2'],
        platform: 'Linux-x86_64',
      };

      expect(info.version).toBe('3.11.0');
      expect(info.sysPath).toHaveLength(2);
    });
  });
});
