/**
 * Jupyter Kernel Service Tests
 */

import type {
  JupyterSession,
  KernelInfo,
  KernelSandboxExecutionResult,
  VariableInfo,
  KernelProgressEvent,
  CellOutputEvent,
} from '@/types/system/jupyter';

// Mock Tauri modules
const mockInvoke = jest.fn();
const mockListen = jest.fn();

jest.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

jest.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}));

// Mock isTauri
const mockIsTauri = jest.fn();
jest.mock('@/lib/native/utils', () => ({
  isTauri: () => mockIsTauri(),
}));

// Import after mocks
import {
  isKernelAvailable,
  createSession,
  listSessions,
  getSession,
  deleteSession,
  listKernels,
  restartKernel,
  interruptKernel,
  execute,
  quickExecute,
  executeCell,
  executeNotebook,
  getVariables,
  getCachedVariables,
  inspectVariable,
  checkKernelAvailable,
  ensureKernel,
  shutdownAll,
  onKernelStatus,
  onKernelOutput,
  onCellOutput,
  kernelService,
} from './kernel';

// Test fixtures
const mockSession: JupyterSession = {
  id: 'session-1',
  name: 'Test Session',
  kernelId: 'kernel-1',
  envPath: '/path/to/env',
  createdAt: '2024-01-01T00:00:00Z',
  lastActivityAt: null,
  metadata: {},
};

const mockKernelInfo: KernelInfo = {
  id: 'kernel-1',
  name: 'python3',
  envPath: '/path/to/env',
  status: 'idle',
  pythonVersion: '3.10.0',
  executionCount: 0,
  createdAt: '2024-01-01T00:00:00Z',
  lastActivityAt: null,
};

const mockSandboxExecutionResult: KernelSandboxExecutionResult = {
  success: true,
  executionCount: 1,
  stdout: 'Hello, World!',
  stderr: '',
  displayData: [],
  error: null,
  executionTimeMs: 100,
};

const mockVariableInfo: VariableInfo = {
  name: 'x',
  type: 'int',
  value: '42',
  size: null,
};

describe('Jupyter Kernel Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isKernelAvailable', () => {
    it('should return true when in Tauri environment', () => {
      mockIsTauri.mockReturnValue(true);
      expect(isKernelAvailable()).toBe(true);
    });

    describe('getCachedVariables', () => {
      it('should get cached variables', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockResolvedValue([mockVariableInfo]);

        const result = await getCachedVariables('session-1');

        expect(mockInvoke).toHaveBeenCalledWith('jupyter_get_cached_variables', {
          sessionId: 'session-1',
        });
        expect(result).toEqual([mockVariableInfo]);
      });

      it('should return empty array when not in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(false);
        const result = await getCachedVariables('session-1');
        expect(result).toEqual([]);
      });

      it('should return empty array on error', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockRejectedValue(new Error('Failed'));
        const result = await getCachedVariables('session-1');
        expect(result).toEqual([]);
      });
    });

    it('should return false when not in Tauri environment', () => {
      mockIsTauri.mockReturnValue(false);
      expect(isKernelAvailable()).toBe(false);
    });
  });

  describe('Session Management', () => {
    describe('createSession', () => {
      it('should create session when in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockResolvedValue(mockSession);

        const result = await createSession({
          name: 'Test Session',
          envPath: '/path/to/env',
        });

        expect(mockInvoke).toHaveBeenCalledWith('jupyter_create_session', {
          name: 'Test Session',
          envPath: '/path/to/env',
        });
        expect(result).toEqual(mockSession);
      });

      it('should call ensureKernel when autoInstallKernel is true', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke
          .mockResolvedValueOnce(true) // ensureKernel
          .mockResolvedValueOnce(mockSession); // createSession

        await createSession({
          name: 'Test Session',
          envPath: '/path/to/env',
          autoInstallKernel: true,
        });

        expect(mockInvoke).toHaveBeenCalledWith('jupyter_ensure_kernel', {
          envPath: '/path/to/env',
        });
      });

      it('should throw error when not in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(false);

        await expect(
          createSession({ name: 'Test', envPath: '/path' })
        ).rejects.toThrow('Jupyter kernel requires Tauri environment');
      });
    });

    describe('listSessions', () => {
      it('should list sessions when in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockResolvedValue([mockSession]);

        const result = await listSessions();

        expect(mockInvoke).toHaveBeenCalledWith('jupyter_list_sessions');
        expect(result).toEqual([mockSession]);
      });

      it('should return empty array when not in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(false);

        const result = await listSessions();

        expect(mockInvoke).not.toHaveBeenCalled();
        expect(result).toEqual([]);
      });

      it('should return empty array on error', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockRejectedValue(new Error('Failed'));

        const result = await listSessions();

        expect(result).toEqual([]);
      });
    });

    describe('getSession', () => {
      it('should get session by ID when in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockResolvedValue(mockSession);

        const result = await getSession('session-1');

        expect(mockInvoke).toHaveBeenCalledWith('jupyter_get_session', {
          sessionId: 'session-1',
        });
        expect(result).toEqual(mockSession);
      });

      it('should return null when not in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(false);

        const result = await getSession('session-1');

        expect(result).toBeNull();
      });

      it('should return null on error', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockRejectedValue(new Error('Not found'));

        const result = await getSession('session-1');

        expect(result).toBeNull();
      });
    });

    describe('deleteSession', () => {
      it('should delete session when in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockResolvedValue(undefined);

        await deleteSession('session-1');

        expect(mockInvoke).toHaveBeenCalledWith('jupyter_delete_session', {
          sessionId: 'session-1',
        });
      });

      it('should throw error when not in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(false);

        await expect(deleteSession('session-1')).rejects.toThrow(
          'Jupyter kernel requires Tauri environment'
        );
      });
    });
  });

  describe('Kernel Management', () => {
    describe('listKernels', () => {
      it('should list kernels when in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockResolvedValue([mockKernelInfo]);

        const result = await listKernels();

        expect(mockInvoke).toHaveBeenCalledWith('jupyter_list_kernels');
        expect(result).toEqual([mockKernelInfo]);
      });

      it('should return empty array when not in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(false);

        const result = await listKernels();

        expect(result).toEqual([]);
      });

      it('should return empty array on error', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockRejectedValue(new Error('Failed'));

        const result = await listKernels();

        expect(result).toEqual([]);
      });
    });

    describe('restartKernel', () => {
      it('should restart kernel when in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockResolvedValue(undefined);

        await restartKernel('session-1');

        expect(mockInvoke).toHaveBeenCalledWith('jupyter_restart_kernel', {
          sessionId: 'session-1',
        });
      });

      it('should throw error when not in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(false);

        await expect(restartKernel('session-1')).rejects.toThrow(
          'Jupyter kernel requires Tauri environment'
        );
      });
    });

    describe('interruptKernel', () => {
      it('should interrupt kernel when in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockResolvedValue(undefined);

        await interruptKernel('session-1');

        expect(mockInvoke).toHaveBeenCalledWith('jupyter_interrupt_kernel', {
          sessionId: 'session-1',
        });
      });

      it('should throw error when not in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(false);

        await expect(interruptKernel('session-1')).rejects.toThrow(
          'Jupyter kernel requires Tauri environment'
        );
      });
    });
  });

  describe('Code Execution', () => {
    describe('execute', () => {
      it('should execute code when in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockResolvedValue(mockSandboxExecutionResult);

        const result = await execute('session-1', 'print("hello")');

        expect(mockInvoke).toHaveBeenCalledWith('jupyter_execute', {
          sessionId: 'session-1',
          code: 'print("hello")',
        });
        expect(result).toEqual(mockSandboxExecutionResult);
      });

      it('should throw error when not in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(false);

        await expect(execute('session-1', 'code')).rejects.toThrow(
          'Jupyter kernel requires Tauri environment'
        );
      });
    });

    describe('quickExecute', () => {
      it('should execute code directly with env path', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockResolvedValue(mockSandboxExecutionResult);

        const result = await quickExecute('/path/to/env', 'print(1)');

        expect(mockInvoke).toHaveBeenCalledWith('jupyter_quick_execute', {
          envPath: '/path/to/env',
          code: 'print(1)',
        });
        expect(result).toEqual(mockSandboxExecutionResult);
      });

      it('should throw error when not in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(false);

        await expect(quickExecute('/path', 'code')).rejects.toThrow(
          'Jupyter kernel requires Tauri environment'
        );
      });
    });

    describe('executeCell', () => {
      it('should execute a specific cell', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockResolvedValue(mockSandboxExecutionResult);

        const result = await executeCell('session-1', 0, 'x = 1');

        expect(mockInvoke).toHaveBeenCalledWith('jupyter_execute_cell', {
          sessionId: 'session-1',
          cellIndex: 0,
          code: 'x = 1',
        });
        expect(result).toEqual(mockSandboxExecutionResult);
      });

      it('should throw error when not in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(false);

        await expect(executeCell('session-1', 0, 'code')).rejects.toThrow(
          'Jupyter kernel requires Tauri environment'
        );
      });
    });

    describe('executeNotebook', () => {
      it('should execute all notebook cells', async () => {
        mockIsTauri.mockReturnValue(true);
        const results = [mockSandboxExecutionResult, mockSandboxExecutionResult];
        mockInvoke.mockResolvedValue(results);

        const result = await executeNotebook('session-1', ['x = 1', 'print(x)']);

        expect(mockInvoke).toHaveBeenCalledWith('jupyter_execute_notebook', {
          sessionId: 'session-1',
          cells: ['x = 1', 'print(x)'],
        });
        expect(result).toEqual(results);
      });

      it('should pass options when provided', async () => {
        mockIsTauri.mockReturnValue(true);
        const results = [mockSandboxExecutionResult];
        mockInvoke.mockResolvedValue(results);

        await executeNotebook('session-1', ['x = 1'], {
          stopOnError: false,
          timeout: 12345,
          clearOutputs: true,
        });

        expect(mockInvoke).toHaveBeenCalledWith('jupyter_execute_notebook', {
          sessionId: 'session-1',
          cells: ['x = 1'],
          options: {
            stopOnError: false,
            timeout: 12345,
            clearOutputs: true,
          },
        });
      });

      it('should throw error when not in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(false);

        await expect(executeNotebook('session-1', ['code'])).rejects.toThrow(
          'Jupyter kernel requires Tauri environment'
        );
      });
    });
  });

  describe('Variable Inspection', () => {
    describe('getVariables', () => {
      it('should get variables from kernel namespace', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockResolvedValue([mockVariableInfo]);

        const result = await getVariables('session-1');

        expect(mockInvoke).toHaveBeenCalledWith('jupyter_get_variables', {
          sessionId: 'session-1',
        });
        expect(result).toEqual([mockVariableInfo]);
      });

      it('should return empty array when not in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(false);

        const result = await getVariables('session-1');

        expect(result).toEqual([]);
      });

      it('should return empty array on error', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockRejectedValue(new Error('Failed'));

        const result = await getVariables('session-1');

        expect(result).toEqual([]);
      });
    });

    describe('inspectVariable', () => {
      it('should inspect a specific variable', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockResolvedValue(mockSandboxExecutionResult);

        const result = await inspectVariable('session-1', 'x');

        expect(mockInvoke).toHaveBeenCalledWith('jupyter_inspect_variable', {
          sessionId: 'session-1',
          variableName: 'x',
        });
        expect(result).toEqual(mockSandboxExecutionResult);
      });

      it('should throw error when not in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(false);

        await expect(inspectVariable('session-1', 'x')).rejects.toThrow(
          'Jupyter kernel requires Tauri environment'
        );
      });
    });
  });

  describe('Utility Functions', () => {
    describe('checkKernelAvailable', () => {
      it('should check if kernel is available for environment', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockResolvedValue(true);

        const result = await checkKernelAvailable('/path/to/env');

        expect(mockInvoke).toHaveBeenCalledWith('jupyter_check_kernel_available', {
          envPath: '/path/to/env',
        });
        expect(result).toBe(true);
      });

      it('should return false when not in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(false);

        const result = await checkKernelAvailable('/path');

        expect(result).toBe(false);
      });

      it('should return false on error', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockRejectedValue(new Error('Failed'));

        const result = await checkKernelAvailable('/path');

        expect(result).toBe(false);
      });
    });

    describe('ensureKernel', () => {
      it('should install ipykernel if not present', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockResolvedValue(true);

        const result = await ensureKernel('/path/to/env');

        expect(mockInvoke).toHaveBeenCalledWith('jupyter_ensure_kernel', {
          envPath: '/path/to/env',
        });
        expect(result).toBe(true);
      });

      it('should throw error when not in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(false);

        await expect(ensureKernel('/path')).rejects.toThrow(
          'Jupyter kernel requires Tauri environment'
        );
      });
    });

    describe('shutdownAll', () => {
      it('should shutdown all kernels when in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(true);
        mockInvoke.mockResolvedValue(undefined);

        await shutdownAll();

        expect(mockInvoke).toHaveBeenCalledWith('jupyter_shutdown_all');
      });

      it('should do nothing when not in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(false);

        await shutdownAll();

        expect(mockInvoke).not.toHaveBeenCalled();
      });
    });
  });

  describe('Event Listeners', () => {
    describe('onKernelStatus', () => {
      it('should register status listener when in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(true);
        const mockUnlisten = jest.fn();
        mockListen.mockResolvedValue(mockUnlisten);

        const callback = jest.fn();
        const unlisten = await onKernelStatus(callback);

        expect(mockListen).toHaveBeenCalledWith(
          'jupyter-kernel-status',
          expect.any(Function)
        );
        expect(unlisten).toBe(mockUnlisten);
      });

      it('should call callback with event payload', async () => {
        mockIsTauri.mockReturnValue(true);
        let capturedHandler: (event: { payload: KernelProgressEvent }) => void;
        mockListen.mockImplementation((_event: string, handler: (event: { payload: KernelProgressEvent }) => void) => {
          capturedHandler = handler;
          return Promise.resolve(jest.fn());
        });

        const callback = jest.fn();
        await onKernelStatus(callback);

        const mockEvent: KernelProgressEvent = {
          kernelId: 'kernel-1',
          status: 'busy',
          executionCount: 1,
          message: 'Running',
        };
        capturedHandler!({ payload: mockEvent });

        expect(callback).toHaveBeenCalledWith(mockEvent);
      });

      it('should return noop function when not in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(false);

        const callback = jest.fn();
        const unlisten = await onKernelStatus(callback);

        expect(mockListen).not.toHaveBeenCalled();
        expect(typeof unlisten).toBe('function');
        unlisten(); // Should not throw
      });
    });

    describe('onKernelOutput', () => {
      it('should register output listener when in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(true);
        const mockUnlisten = jest.fn();
        mockListen.mockResolvedValue(mockUnlisten);

        const callback = jest.fn();
        const unlisten = await onKernelOutput(callback);

        expect(mockListen).toHaveBeenCalledWith(
          'jupyter-output',
          expect.any(Function)
        );
        expect(unlisten).toBe(mockUnlisten);
      });

      it('should call callback with execution result', async () => {
        mockIsTauri.mockReturnValue(true);
        let capturedHandler: (event: { payload: KernelSandboxExecutionResult }) => void;
        mockListen.mockImplementation((_event: string, handler: (event: { payload: KernelSandboxExecutionResult }) => void) => {
          capturedHandler = handler;
          return Promise.resolve(jest.fn());
        });

        const callback = jest.fn();
        await onKernelOutput(callback);

        capturedHandler!({ payload: mockSandboxExecutionResult });

        expect(callback).toHaveBeenCalledWith(mockSandboxExecutionResult);
      });

      it('should return noop function when not in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(false);

        const callback = jest.fn();
        const unlisten = await onKernelOutput(callback);

        expect(mockListen).not.toHaveBeenCalled();
        expect(typeof unlisten).toBe('function');
      });
    });

    describe('onCellOutput', () => {
      it('should register cell output listener when in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(true);
        const mockUnlisten = jest.fn();
        mockListen.mockResolvedValue(mockUnlisten);

        const callback = jest.fn();
        const unlisten = await onCellOutput(callback);

        expect(mockListen).toHaveBeenCalledWith(
          'jupyter-cell-output',
          expect.any(Function)
        );
        expect(unlisten).toBe(mockUnlisten);
      });

      it('should call callback with cell output event', async () => {
        mockIsTauri.mockReturnValue(true);
        let capturedHandler: (event: { payload: CellOutputEvent }) => void;
        mockListen.mockImplementation((_event: string, handler: (event: { payload: CellOutputEvent }) => void) => {
          capturedHandler = handler;
          return Promise.resolve(jest.fn());
        });

        const callback = jest.fn();
        await onCellOutput(callback);

        const mockCellEvent: CellOutputEvent = {
          cellIndex: 0,
          result: mockSandboxExecutionResult,
          total: 5,
        };
        capturedHandler!({ payload: mockCellEvent });

        expect(callback).toHaveBeenCalledWith(mockCellEvent);
      });

      it('should return noop function when not in Tauri environment', async () => {
        mockIsTauri.mockReturnValue(false);

        const callback = jest.fn();
        const unlisten = await onCellOutput(callback);

        expect(mockListen).not.toHaveBeenCalled();
        expect(typeof unlisten).toBe('function');
      });
    });
  });

  describe('kernelService object', () => {
    it('should expose all kernel functions', () => {
      expect(kernelService.isAvailable).toBe(isKernelAvailable);
      expect(kernelService.createSession).toBe(createSession);
      expect(kernelService.listSessions).toBe(listSessions);
      expect(kernelService.getSession).toBe(getSession);
      expect(kernelService.deleteSession).toBe(deleteSession);
      expect(kernelService.listKernels).toBe(listKernels);
      expect(kernelService.restartKernel).toBe(restartKernel);
      expect(kernelService.interruptKernel).toBe(interruptKernel);
      expect(kernelService.execute).toBe(execute);
      expect(kernelService.quickExecute).toBe(quickExecute);
      expect(kernelService.executeCell).toBe(executeCell);
      expect(kernelService.executeNotebook).toBe(executeNotebook);
      expect(kernelService.getVariables).toBe(getVariables);
      expect(kernelService.inspectVariable).toBe(inspectVariable);
      expect(kernelService.checkKernelAvailable).toBe(checkKernelAvailable);
      expect(kernelService.ensureKernel).toBe(ensureKernel);
      expect(kernelService.shutdownAll).toBe(shutdownAll);
      expect(kernelService.onKernelStatus).toBe(onKernelStatus);
      expect(kernelService.onKernelOutput).toBe(onKernelOutput);
      expect(kernelService.onCellOutput).toBe(onCellOutput);
    });
  });
});
