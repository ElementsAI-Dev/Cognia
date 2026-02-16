/**
 * Tests for lib/native/process.ts
 */

import { 
  isProcessManagementAvailable,
  processService,
} from './process';
import { isTauri } from './utils';

// Mock the utils module
jest.mock('./utils', () => ({
  isTauri: jest.fn(),
}));

// Mock @tauri-apps/api/core
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;

describe('Process Management Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isProcessManagementAvailable', () => {
    it('returns true when running in Tauri', () => {
      mockIsTauri.mockReturnValue(true);
      expect(isProcessManagementAvailable()).toBe(true);
    });

    it('returns false when not in Tauri', () => {
      mockIsTauri.mockReturnValue(false);
      expect(isProcessManagementAvailable()).toBe(false);
    });
  });

  describe('processService', () => {
    it('has all expected methods', () => {
      expect(processService.isAvailable).toBeDefined();
      expect(processService.list).toBeDefined();
      expect(processService.get).toBeDefined();
      expect(processService.start).toBeDefined();
      expect(processService.terminate).toBeDefined();
      expect(processService.startBatch).toBeDefined();
      expect(processService.terminateBatch).toBeDefined();
      expect(processService.startBatchAsync).toBeDefined();
      expect(processService.terminateBatchAsync).toBeDefined();
      expect(processService.getOperation).toBeDefined();
      expect(processService.listOperations).toBeDefined();
      expect(processService.getConfig).toBeDefined();
      expect(processService.updateConfig).toBeDefined();
      expect(processService.isProgramAllowed).toBeDefined();
      expect(processService.getTracked).toBeDefined();
      expect(processService.isEnabled).toBeDefined();
      expect(processService.setEnabled).toBeDefined();
      expect(processService.search).toBeDefined();
      expect(processService.topMemory).toBeDefined();
    });
  });

  describe('when not in Tauri', () => {
    beforeEach(() => {
      mockIsTauri.mockReturnValue(false);
    });

    it('listProcesses throws error', async () => {
      await expect(processService.list()).rejects.toThrow(
        'Process management requires Tauri environment'
      );
    });

    it('getProcess throws error', async () => {
      await expect(processService.get(123)).rejects.toThrow(
        'Process management requires Tauri environment'
      );
    });

    it('startProcess throws error', async () => {
      await expect(processService.start({ program: 'test' })).rejects.toThrow(
        'Process management requires Tauri environment'
      );
    });

    it('terminateProcess throws error', async () => {
      await expect(processService.terminate({ pid: 123 })).rejects.toThrow(
        'Process management requires Tauri environment'
      );
    });

    it('startProcessBatch throws error', async () => {
      await expect(processService.startBatch({ requests: [] })).rejects.toThrow(
        'Process management requires Tauri environment'
      );
    });

    it('terminateProcessBatch throws error', async () => {
      await expect(processService.terminateBatch({ requests: [] })).rejects.toThrow(
        'Process management requires Tauri environment'
      );
    });

    it('startProcessBatchAsync throws error', async () => {
      await expect(processService.startBatchAsync({ requests: [] })).rejects.toThrow(
        'Process management requires Tauri environment'
      );
    });

    it('terminateProcessBatchAsync throws error', async () => {
      await expect(processService.terminateBatchAsync({ requests: [] })).rejects.toThrow(
        'Process management requires Tauri environment'
      );
    });

    it('getProcessOperation throws error', async () => {
      await expect(processService.getOperation('op-1')).rejects.toThrow(
        'Process management requires Tauri environment'
      );
    });

    it('listProcessOperations throws error', async () => {
      await expect(processService.listOperations()).rejects.toThrow(
        'Process management requires Tauri environment'
      );
    });

    it('isProgramAllowed returns false', async () => {
      const result = await processService.isProgramAllowed('test');
      expect(result).toBe(false);
    });

    it('getTrackedProcesses returns empty array', async () => {
      const result = await processService.getTracked();
      expect(result).toEqual([]);
    });

    it('isEnabled returns false', async () => {
      const result = await processService.isEnabled();
      expect(result).toBe(false);
    });

    it('getConfig throws error', async () => {
      await expect(processService.getConfig()).rejects.toThrow(
        'Process management requires Tauri environment'
      );
    });

    it('updateConfig throws error', async () => {
      const config = {
        enabled: true,
        allowedPrograms: [],
        deniedPrograms: [],
        allowTerminateAny: false,
        onlyTerminateOwn: true,
        maxTrackedProcesses: 100,
        defaultTimeoutSecs: 30,
      };
      await expect(processService.updateConfig(config)).rejects.toThrow(
        'Process management requires Tauri environment'
      );
    });

    it('setEnabled throws error', async () => {
      await expect(processService.setEnabled(true)).rejects.toThrow(
        'Process management requires Tauri environment'
      );
    });

    it('search throws error', async () => {
      await expect(processService.search('test')).rejects.toThrow(
        'Process management requires Tauri environment'
      );
    });

    it('topMemory throws error', async () => {
      await expect(processService.topMemory()).rejects.toThrow(
        'Process management requires Tauri environment'
      );
    });
  });

  describe('when in Tauri', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { invoke } = require('@tauri-apps/api/core');
    const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

    beforeEach(() => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockClear();
    });

    it('listProcesses calls invoke with filter', async () => {
      const mockProcesses = [{ pid: 1, name: 'test', status: 'running' }];
      mockInvoke.mockResolvedValue(mockProcesses);

      const filter = { name: 'test', limit: 10 };
      const result = await processService.list(filter);

      expect(mockInvoke).toHaveBeenCalledWith(
        'process_list',
        expect.objectContaining({
          filter: expect.objectContaining({
            name: 'test',
            limit: 10,
          }),
        })
      );
      expect(result).toEqual(mockProcesses);
    });

    it('getProcess calls invoke with pid', async () => {
      const mockProcess = { pid: 123, name: 'test', status: 'running' };
      mockInvoke.mockResolvedValue(mockProcess);

      const result = await processService.get(123);

      expect(mockInvoke).toHaveBeenCalledWith('process_get', { pid: 123 });
      expect(result).toEqual(mockProcess);
    });

    it('startProcess calls invoke with request', async () => {
      const mockResult = { success: true, pid: 456 };
      mockInvoke.mockResolvedValue(mockResult);

      const request = { program: 'notepad', args: ['test.txt'] };
      const result = await processService.start(request);

      expect(mockInvoke).toHaveBeenCalledWith(
        'process_start',
        expect.objectContaining({
          request: expect.objectContaining({
            program: 'notepad',
            args: ['test.txt'],
          }),
        })
      );
      expect(result).toEqual(mockResult);
    });

    it('terminateProcess calls invoke with request', async () => {
      const mockResult = { success: true, exitCode: 0 };
      mockInvoke.mockResolvedValue(mockResult);

      const request = { pid: 123, force: false };
      const result = await processService.terminate(request);

      expect(mockInvoke).toHaveBeenCalledWith(
        'process_terminate',
        expect.objectContaining({
          request: expect.objectContaining({
            pid: 123,
            force: false,
          }),
        })
      );
      expect(result).toEqual(mockResult);
    });

    it('startProcessBatch calls invoke with request', async () => {
      const mockResult = { total: 1, successCount: 1, failureCount: 0, results: [] };
      mockInvoke.mockResolvedValue(mockResult);

      const request = {
        requests: [{ program: 'notepad', args: ['test.txt'] }],
        maxConcurrency: 3,
      };
      const result = await processService.startBatch(request);

      expect(mockInvoke).toHaveBeenCalledWith(
        'process_start_batch',
        expect.objectContaining({
          request: expect.objectContaining({
            maxConcurrency: 3,
            max_concurrency: 3,
          }),
        })
      );
      expect(result).toEqual(mockResult);
    });

    it('terminateProcessBatch calls invoke with request', async () => {
      const mockResult = { total: 1, successCount: 1, failureCount: 0, results: [] };
      mockInvoke.mockResolvedValue(mockResult);

      const request = {
        requests: [{ pid: 123, force: true }],
        maxConcurrency: 2,
      };
      const result = await processService.terminateBatch(request);

      expect(mockInvoke).toHaveBeenCalledWith(
        'process_terminate_batch',
        expect.objectContaining({
          request: expect.objectContaining({
            maxConcurrency: 2,
            max_concurrency: 2,
          }),
        })
      );
      expect(result).toEqual(mockResult);
    });

    it('startProcessBatchAsync calls invoke', async () => {
      const mockResult = {
        operationId: 'op-1',
        operationType: 'startBatch',
        status: 'pending',
        createdAt: 100,
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await processService.startBatchAsync({ requests: [] });

      expect(mockInvoke).toHaveBeenCalledWith(
        'process_start_batch_async',
        expect.objectContaining({
          request: expect.objectContaining({ requests: [] }),
        })
      );
      expect(result).toEqual(mockResult);
    });

    it('terminateProcessBatchAsync calls invoke', async () => {
      const mockResult = {
        operationId: 'op-2',
        operationType: 'terminateBatch',
        status: 'pending',
        createdAt: 101,
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await processService.terminateBatchAsync({ requests: [] });

      expect(mockInvoke).toHaveBeenCalledWith(
        'process_terminate_batch_async',
        expect.objectContaining({
          request: expect.objectContaining({ requests: [] }),
        })
      );
      expect(result).toEqual(mockResult);
    });

    it('getProcessOperation calls invoke', async () => {
      const mockResult = {
        operation_id: 'op-3',
        operation_type: 'startBatch',
        status: 'completed',
        created_at: 100,
        started_at: 101,
        completed_at: 102,
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await processService.getOperation('op-3');

      expect(mockInvoke).toHaveBeenCalledWith('process_get_operation', {
        operationId: 'op-3',
        operation_id: 'op-3',
      });
      expect(result).toEqual({
        operationId: 'op-3',
        operationType: 'startBatch',
        status: 'completed',
        createdAt: 100,
        startedAt: 101,
        completedAt: 102,
        error: undefined,
        result: undefined,
      });
    });

    it('listProcessOperations calls invoke', async () => {
      const mockResult = [
        {
          operationId: 'op-4',
          operationType: 'terminateBatch',
          status: 'running',
          createdAt: 200,
        },
      ];
      mockInvoke.mockResolvedValue(mockResult);

      const result = await processService.listOperations(5);

      expect(mockInvoke).toHaveBeenCalledWith('process_list_operations', { limit: 5 });
      expect(result).toEqual(mockResult);
    });

    it('isProgramAllowed calls invoke', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await processService.isProgramAllowed('notepad');

      expect(mockInvoke).toHaveBeenCalledWith('process_is_allowed', { program: 'notepad' });
      expect(result).toBe(true);
    });

    it('getTrackedProcesses calls invoke', async () => {
      mockInvoke.mockResolvedValue([1, 2, 3]);

      const result = await processService.getTracked();

      expect(mockInvoke).toHaveBeenCalledWith('process_get_tracked');
      expect(result).toEqual([1, 2, 3]);
    });

    it('isEnabled calls invoke', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await processService.isEnabled();

      expect(mockInvoke).toHaveBeenCalledWith('process_is_enabled');
      expect(result).toBe(true);
    });

    it('setEnabled calls invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await processService.setEnabled(true);

      expect(mockInvoke).toHaveBeenCalledWith('process_set_enabled', { enabled: true });
    });

    it('search calls invoke with name and limit', async () => {
      const mockProcesses = [{ pid: 1, name: 'chrome', status: 'running' }];
      mockInvoke.mockResolvedValue(mockProcesses);

      const result = await processService.search('chrome', 5);

      expect(mockInvoke).toHaveBeenCalledWith('process_search', { name: 'chrome', limit: 5 });
      expect(result).toEqual(mockProcesses);
    });

    it('topMemory calls invoke with limit', async () => {
      const mockProcesses = [{ pid: 1, name: 'chrome', memoryBytes: 1000000, status: 'running' }];
      mockInvoke.mockResolvedValue(mockProcesses);

      const result = await processService.topMemory(10);

      expect(mockInvoke).toHaveBeenCalledWith('process_top_memory', { limit: 10 });
      expect(result).toEqual(mockProcesses);
    });

    it('getConfig calls invoke', async () => {
      const mockConfig = {
        enabled: true,
        allowedPrograms: ['notepad'],
        deniedPrograms: [],
        allowTerminateAny: false,
        onlyTerminateOwn: true,
        maxTrackedProcesses: 100,
        defaultTimeoutSecs: 30,
      };
      mockInvoke.mockResolvedValue(mockConfig);

      const result = await processService.getConfig();

      expect(mockInvoke).toHaveBeenCalledWith('process_get_config');
      expect(result).toEqual(mockConfig);
    });

    it('updateConfig calls invoke with config', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const config = {
        enabled: true,
        allowedPrograms: ['notepad'],
        deniedPrograms: [],
        allowTerminateAny: false,
        onlyTerminateOwn: true,
        maxTrackedProcesses: 100,
        defaultTimeoutSecs: 30,
      };
      await processService.updateConfig(config);

      expect(mockInvoke).toHaveBeenCalledWith(
        'process_update_config',
        expect.objectContaining({
          config: expect.objectContaining({
            enabled: true,
            allowedPrograms: ['notepad'],
            allowed_programs: ['notepad'],
            deniedPrograms: [],
            denied_programs: [],
            allowTerminateAny: false,
            allow_terminate_any: false,
            onlyTerminateOwn: true,
            only_terminate_own: true,
            maxTrackedProcesses: 100,
            max_tracked_processes: 100,
            defaultTimeoutSecs: 30,
            default_timeout_secs: 30,
          }),
        })
      );
    });

    it('normalizes snake_case process response fields', async () => {
      mockInvoke.mockResolvedValue([
        {
          pid: 42,
          name: 'python',
          exe_path: '/usr/bin/python',
          cmd_line: ['python', '-V'],
          parent_pid: 1,
          cpu_percent: 1.5,
          memory_bytes: 1024,
          status: 'running',
          start_time: 1234,
        },
      ]);

      const [first] = await processService.list();

      expect(first).toEqual({
        pid: 42,
        name: 'python',
        exePath: '/usr/bin/python',
        cmdLine: ['python', '-V'],
        parentPid: 1,
        cpuPercent: 1.5,
        memoryBytes: 1024,
        status: 'running',
        startTime: 1234,
        user: undefined,
        cwd: undefined,
      });
    });

    it('normalizes snake_case config response fields', async () => {
      mockInvoke.mockResolvedValue({
        enabled: true,
        allowed_programs: ['node'],
        denied_programs: ['rm'],
        allow_terminate_any: false,
        only_terminate_own: true,
        max_tracked_processes: 20,
        default_timeout_secs: 12,
      });

      const result = await processService.getConfig();

      expect(result).toEqual({
        enabled: true,
        allowedPrograms: ['node'],
        deniedPrograms: ['rm'],
        allowTerminateAny: false,
        onlyTerminateOwn: true,
        maxTrackedProcesses: 20,
        defaultTimeoutSecs: 12,
      });
    });

    it('normalizes tagged operation result payload', async () => {
      mockInvoke.mockResolvedValue({
        operation_id: 'op-5',
        operation_type: 'startBatch',
        status: 'completed',
        created_at: 300,
        result: {
          kind: 'startBatch',
          payload: {
            total: 1,
            success_count: 1,
            failure_count: 0,
            results: [
              {
                index: 0,
                program: 'node',
                result: {
                  success: true,
                  pid: 1,
                  exit_code: 0,
                },
              },
            ],
          },
        },
      });

      const result = await processService.getOperation('op-5');

      expect(result).toEqual({
        operationId: 'op-5',
        operationType: 'startBatch',
        status: 'completed',
        createdAt: 300,
        startedAt: undefined,
        completedAt: undefined,
        error: undefined,
        result: {
          kind: 'startBatch',
          payload: {
            total: 1,
            successCount: 1,
            failureCount: 0,
            results: [
              {
                index: 0,
                program: 'node',
                result: {
                  success: true,
                  pid: 1,
                  stdout: undefined,
                  stderr: undefined,
                  exitCode: 0,
                  error: undefined,
                  durationMs: undefined,
                },
              },
            ],
          },
        },
      });
    });
  });
});
