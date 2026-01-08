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
  });
});
