/**
 * useSandbox Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';

// Mock the sandbox service
jest.mock('@/lib/native/sandbox', () => ({
  sandboxService: {
    isAvailable: jest.fn(),
    getStatus: jest.fn(),
    getLanguages: jest.fn(),
    getRuntimes: jest.fn(),
    getAllLanguages: jest.fn().mockResolvedValue([]),
    getAvailableLanguages: jest.fn().mockResolvedValue([]),
    preflight: jest.fn(),
    execute: jest.fn(),
    quickExecute: jest.fn(),
    executeWithStdin: jest.fn(),
    updateConfig: jest.fn(),
    setRuntime: jest.fn(),
    toggleLanguage: jest.fn(),
    prepareLanguage: jest.fn(),
  },
}));

// Mock context sync (best-effort, should not affect sandbox behavior)
jest.mock('@/lib/context', () => ({
  syncSandboxExecution: jest.fn(() => Promise.resolve()),
}));

// Mock plugin event hooks
const mockDispatchCodeExecutionStart = jest.fn();
const mockDispatchCodeExecutionComplete = jest.fn();
const mockDispatchCodeExecutionError = jest.fn();
jest.mock('@/lib/plugin', () => ({
  getPluginEventHooks: () => ({
    dispatchCodeExecutionStart: mockDispatchCodeExecutionStart,
    dispatchCodeExecutionComplete: mockDispatchCodeExecutionComplete,
    dispatchCodeExecutionError: mockDispatchCodeExecutionError,
  }),
}));

import { useSandbox, useQuickCodeExecution } from './use-sandbox';
import { sandboxService } from '@/lib/native/sandbox';
import type { SandboxExecutionResult, SandboxStatus } from '@/types/system/sandbox';

const mockSandboxService = sandboxService as jest.Mocked<typeof sandboxService>;

describe('useSandbox Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should start in loading state', async () => {
      mockSandboxService.isAvailable.mockResolvedValue(false);

      const { result } = renderHook(() => useSandbox());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set isAvailable to false when sandbox is not available', async () => {
      mockSandboxService.isAvailable.mockResolvedValue(false);

      const { result } = renderHook(() => useSandbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAvailable).toBe(false);
    });

    it('should load status when sandbox is available', async () => {
      const mockStatus: SandboxStatus = {
        available_runtimes: [{ runtime_type: 'docker', available: true, version: '24.0.0' }],
        supported_languages: [
          { id: 'python', name: 'Python', extension: 'py', category: 'interpreted' },
        ],
        config: {
          preferred_runtime: 'docker',
          enable_docker: true,
          enable_podman: false,
          enable_native: false,
          default_timeout_secs: 30,
          default_memory_limit_mb: 256,
          default_cpu_limit_percent: 50,
          max_output_size: 1048576,
          custom_images: {},
          network_enabled: false,
          workspace_dir: null,
          enabled_languages: ['python'],
        },
      };

      mockSandboxService.isAvailable.mockResolvedValue(true);
      mockSandboxService.getStatus.mockResolvedValue(mockStatus);
      mockSandboxService.getLanguages.mockResolvedValue(mockStatus.supported_languages);
      mockSandboxService.getRuntimes.mockResolvedValue(['docker']);

      const { result } = renderHook(() => useSandbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAvailable).toBe(true);
      expect(result.current.status).toEqual(mockStatus);
      expect(result.current.languages).toHaveLength(1);
      expect(result.current.runtimes).toContain('docker');
    });

    it('should handle initialization error', async () => {
      mockSandboxService.isAvailable.mockRejectedValue(new Error('Connection failed'));

      const { result } = renderHook(() => useSandbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAvailable).toBe(false);
    });
  });

  describe('preflight', () => {
    const setupAvailableSandbox = () => {
      mockSandboxService.isAvailable.mockResolvedValue(true);
      mockSandboxService.getStatus.mockResolvedValue({
        available_runtimes: [],
        supported_languages: [],
        config: {} as SandboxStatus['config'],
      });
      mockSandboxService.getLanguages.mockResolvedValue([]);
      mockSandboxService.getRuntimes.mockResolvedValue(['docker']);
    };

    it('should cache preflight result for identical request', async () => {
      setupAvailableSandbox();
      mockSandboxService.preflight.mockResolvedValue({
        status: 'ready',
        reason_code: 'ok',
        message: 'ready',
        remediation_hint: undefined,
        selected_runtime: 'docker',
        policy_profile: 'balanced',
      });

      const { result } = renderHook(() => useSandbox());
      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
      });

      await result.current.runPreflight({ language: 'python' });
      await result.current.runPreflight({ language: 'python' });

      expect(mockSandboxService.preflight).toHaveBeenCalledTimes(1);
    });

    it('should invalidate preflight cache after config update', async () => {
      setupAvailableSandbox();
      mockSandboxService.preflight.mockResolvedValue({
        status: 'ready',
        reason_code: 'ok',
        message: 'ready',
        remediation_hint: undefined,
        selected_runtime: 'docker',
        policy_profile: 'balanced',
      });
      mockSandboxService.updateConfig.mockResolvedValue();

      const { result } = renderHook(() => useSandbox());
      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
      });

      await result.current.runPreflight({ language: 'python' });
      await result.current.updateConfig({} as SandboxStatus['config']);
      await result.current.runPreflight({ language: 'python' });

      expect(mockSandboxService.preflight).toHaveBeenCalledTimes(2);
    });
  });

  describe('execute', () => {
    it('should throw when sandbox is not available', async () => {
      mockSandboxService.isAvailable.mockResolvedValue(false);

      const { result } = renderHook(() => useSandbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        result.current.execute({ language: 'python', code: 'print("hello")' })
      ).rejects.toThrow('Sandbox is not available');
    });

    it('should call sandboxService.execute when available', async () => {
      const mockResult: SandboxExecutionResult = {
        id: 'test-id',
        status: 'completed',
        stdout: 'Hello, World!',
        stderr: '',
        exit_code: 0,
        execution_time_ms: 100,
        memory_used_bytes: null,
        error: null,
        runtime: 'docker',
        language: 'python',
      };

      mockSandboxService.isAvailable.mockResolvedValue(true);
      mockSandboxService.getStatus.mockResolvedValue({
        available_runtimes: [],
        supported_languages: [],
        config: {} as SandboxStatus['config'],
      });
      mockSandboxService.getLanguages.mockResolvedValue([]);
      mockSandboxService.getRuntimes.mockResolvedValue(['docker']);
      mockSandboxService.execute.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useSandbox());

      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
      });

      const execResult = await result.current.execute({
        language: 'python',
        code: 'print("hello")',
      });

      expect(execResult).toEqual({
        ...mockResult,
        lifecycle_status: 'success',
        diagnostics: null,
      });
      expect(mockSandboxService.execute).toHaveBeenCalledWith({
        language: 'python',
        code: 'print("hello")',
      });
    });
  });

  describe('quickExecute', () => {
    it('should call sandboxService.quickExecute', async () => {
      const mockResult: SandboxExecutionResult = {
        id: 'test-id',
        status: 'completed',
        stdout: 'Hello',
        stderr: '',
        exit_code: 0,
        execution_time_ms: 50,
        memory_used_bytes: null,
        error: null,
        runtime: 'docker',
        language: 'python',
      };

      mockSandboxService.isAvailable.mockResolvedValue(true);
      mockSandboxService.getStatus.mockResolvedValue({
        available_runtimes: [],
        supported_languages: [],
        config: {} as SandboxStatus['config'],
      });
      mockSandboxService.getLanguages.mockResolvedValue([]);
      mockSandboxService.getRuntimes.mockResolvedValue(['docker']);
      mockSandboxService.quickExecute.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useSandbox());

      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
      });

      const execResult = await result.current.quickExecute('python', 'print("hello")');

      expect(execResult.stdout).toBe('Hello');
      expect(mockSandboxService.quickExecute).toHaveBeenCalledWith('python', 'print("hello")');
    });
  });

  describe('refreshStatus', () => {
    it('should refresh status from sandbox service', async () => {
      mockSandboxService.isAvailable.mockResolvedValue(true);
      mockSandboxService.getStatus.mockResolvedValue({
        available_runtimes: [],
        supported_languages: [],
        config: {} as SandboxStatus['config'],
      });
      mockSandboxService.getLanguages.mockResolvedValue([]);
      mockSandboxService.getRuntimes.mockResolvedValue(['docker']);

      const { result } = renderHook(() => useSandbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Update mock to return different data
      mockSandboxService.getRuntimes.mockResolvedValue(['docker', 'podman']);

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(result.current.runtimes).toContain('podman');
    });
  });
});

describe('useQuickCodeExecution Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start with initial state', () => {
    const { result } = renderHook(() => useQuickCodeExecution());

    expect(result.current.isExecuting).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should execute code and update state', async () => {
    const mockResult: SandboxExecutionResult = {
      id: 'test-id',
      status: 'completed',
      stdout: 'Hello',
      stderr: '',
      exit_code: 0,
      execution_time_ms: 100,
      memory_used_bytes: null,
      error: null,
      runtime: 'docker',
      language: 'python',
    };

    mockSandboxService.quickExecute.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useQuickCodeExecution());

    await act(async () => {
      await result.current.execute('python', 'print("hello")');
    });

    expect(result.current.isExecuting).toBe(false);
    expect(result.current.result).toEqual(mockResult);
    expect(result.current.error).toBeNull();
  });

  it('should handle execution with stdin', async () => {
    const mockResult: SandboxExecutionResult = {
      id: 'test-id',
      status: 'completed',
      stdout: 'test input',
      stderr: '',
      exit_code: 0,
      execution_time_ms: 100,
      memory_used_bytes: null,
      error: null,
      runtime: 'docker',
      language: 'python',
    };

    mockSandboxService.executeWithStdin.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useQuickCodeExecution());

    await act(async () => {
      await result.current.execute('python', 'print(input())', 'test input');
    });

    expect(mockSandboxService.executeWithStdin).toHaveBeenCalledWith(
      'python',
      'print(input())',
      'test input'
    );
    expect(result.current.result?.stdout).toBe('test input');
  });

  it('should handle execution error', async () => {
    mockSandboxService.quickExecute.mockRejectedValue(new Error('Execution failed'));

    const { result } = renderHook(() => useQuickCodeExecution());

    await act(async () => {
      try {
        await result.current.execute('python', 'invalid code');
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.isExecuting).toBe(false);
    expect(result.current.error).toBe('Execution failed');
    expect(result.current.result).toBeNull();
  });

  it('should reset state', async () => {
    const mockResult: SandboxExecutionResult = {
      id: 'test-id',
      status: 'completed',
      stdout: 'Hello',
      stderr: '',
      exit_code: 0,
      execution_time_ms: 100,
      memory_used_bytes: null,
      error: null,
      runtime: 'docker',
      language: 'python',
    };

    mockSandboxService.quickExecute.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useQuickCodeExecution());

    await act(async () => {
      await result.current.execute('python', 'print("hello")');
    });

    expect(result.current.result).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

describe('Plugin hook dispatches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupAvailableSandbox = () => {
    mockSandboxService.isAvailable.mockResolvedValue(true);
    mockSandboxService.getStatus.mockResolvedValue({
      available_runtimes: [],
      supported_languages: [],
      config: {} as SandboxStatus['config'],
    });
    mockSandboxService.getLanguages.mockResolvedValue([]);
    mockSandboxService.getRuntimes.mockResolvedValue(['docker']);
  };

  it('should dispatch onCodeExecutionStart before execute', async () => {
    setupAvailableSandbox();
    const mockResult: SandboxExecutionResult = {
      id: 'test-id', status: 'completed', stdout: 'ok', stderr: '',
      exit_code: 0, execution_time_ms: 50, memory_used_bytes: null,
      error: null, runtime: 'docker', language: 'python',
    };
    mockSandboxService.execute.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useSandbox());
    await waitFor(() => { expect(result.current.isAvailable).toBe(true); });

    await result.current.execute({ language: 'python', code: 'print(1)' });

    expect(mockDispatchCodeExecutionStart).toHaveBeenCalledWith('python', 'print(1)');
  });

  it('should dispatch onCodeExecutionComplete after successful execute', async () => {
    setupAvailableSandbox();
    const mockResult: SandboxExecutionResult = {
      id: 'test-id', status: 'completed', stdout: 'ok', stderr: '',
      exit_code: 0, execution_time_ms: 50, memory_used_bytes: null,
      error: null, runtime: 'docker', language: 'python',
    };
    mockSandboxService.execute.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useSandbox());
    await waitFor(() => { expect(result.current.isAvailable).toBe(true); });

    await result.current.execute({ language: 'python', code: 'print(1)' });

    expect(mockDispatchCodeExecutionComplete).toHaveBeenCalledWith(
      'python',
      expect.objectContaining({
        ...mockResult,
        lifecycle_status: 'success',
        diagnostics: null,
      })
    );
  });

  it('should dispatch onCodeExecutionError after failed execute', async () => {
    setupAvailableSandbox();
    const mockResult: SandboxExecutionResult = {
      id: 'test-id', status: 'failed', stdout: '', stderr: 'SyntaxError',
      exit_code: 1, execution_time_ms: 10, memory_used_bytes: null,
      error: null, runtime: 'docker', language: 'python',
    };
    mockSandboxService.execute.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useSandbox());
    await waitFor(() => { expect(result.current.isAvailable).toBe(true); });

    await result.current.execute({ language: 'python', code: 'invalid' });

    expect(mockDispatchCodeExecutionError).toHaveBeenCalledWith(
      'python',
      expect.objectContaining({ message: 'SyntaxError' })
    );
  });

  it('should dispatch hooks for quickExecute', async () => {
    setupAvailableSandbox();
    const mockResult: SandboxExecutionResult = {
      id: 'test-id', status: 'completed', stdout: 'hello', stderr: '',
      exit_code: 0, execution_time_ms: 50, memory_used_bytes: null,
      error: null, runtime: 'docker', language: 'javascript',
    };
    mockSandboxService.quickExecute.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useSandbox());
    await waitFor(() => { expect(result.current.isAvailable).toBe(true); });

    await result.current.quickExecute('javascript', 'console.log("hello")');

    expect(mockDispatchCodeExecutionStart).toHaveBeenCalledWith('javascript', 'console.log("hello")');
    expect(mockDispatchCodeExecutionComplete).toHaveBeenCalledWith(
      'javascript',
      expect.objectContaining({
        ...mockResult,
        lifecycle_status: 'success',
        diagnostics: null,
      })
    );
  });
});
