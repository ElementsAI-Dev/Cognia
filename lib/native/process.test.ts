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

      expect(mockInvoke).toHaveBeenCalledWith('process_list', { filter });
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

      expect(mockInvoke).toHaveBeenCalledWith('process_start', { request });
      expect(result).toEqual(mockResult);
    });

    it('terminateProcess calls invoke with request', async () => {
      const mockResult = { success: true, exitCode: 0 };
      mockInvoke.mockResolvedValue(mockResult);

      const request = { pid: 123, force: false };
      const result = await processService.terminate(request);

      expect(mockInvoke).toHaveBeenCalledWith('process_terminate', { request });
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

      expect(mockInvoke).toHaveBeenCalledWith('process_update_config', { config });
    });
  });
});
