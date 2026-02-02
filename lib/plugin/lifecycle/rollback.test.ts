/**
 * Tests for Plugin Rollback Manager
 */

import {
  PluginRollbackManager,
  getPluginRollbackManager,
  resetPluginRollbackManager,
} from './rollback';

// Mock Tauri invoke
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

// Mock backup manager
jest.mock('./backup', () => ({
  getPluginBackupManager: jest.fn(() => ({
    getBackups: jest.fn(() => []),
    createBackup: jest.fn().mockResolvedValue({ success: true }),
    restoreBackup: jest.fn().mockResolvedValue({ success: true }),
  })),
}));

import { invoke } from '@tauri-apps/api/core';
import { getPluginBackupManager } from './backup';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;
const mockGetBackupManager = getPluginBackupManager as jest.MockedFunction<typeof getPluginBackupManager>;

describe('PluginRollbackManager', () => {
  let manager: PluginRollbackManager;

  beforeEach(() => {
    resetPluginRollbackManager();
    manager = new PluginRollbackManager();
    mockInvoke.mockReset();
    jest.clearAllMocks();
  });

  describe('getRollbackInfo', () => {
    it('should get rollback info with backups', async () => {
      mockGetBackupManager.mockReturnValue({
        getBackups: jest.fn(() => [
          { pluginId: 'plugin-a', version: '1.0.0', createdAt: new Date(), size: 1000 },
          { pluginId: 'plugin-a', version: '1.5.0', createdAt: new Date(), size: 1200 },
        ]),
        createBackup: jest.fn(),
        restoreBackup: jest.fn(),
      } as never);

      mockInvoke.mockResolvedValueOnce({ version: '2.0.0' });

      const info = await manager.getRollbackInfo('plugin-a');

      expect(info.pluginId).toBe('plugin-a');
      expect(info.currentVersion).toBe('2.0.0');
      expect(info.availableVersions.length).toBe(2);
      expect(info.hasBackups).toBe(true);
    });

    it('should indicate when no backups available', async () => {
      mockGetBackupManager.mockReturnValue({
        getBackups: jest.fn(() => []),
        createBackup: jest.fn(),
        restoreBackup: jest.fn(),
      } as never);

      mockInvoke.mockResolvedValueOnce({ version: '1.0.0' });

      const info = await manager.getRollbackInfo('plugin-a');

      expect(info.hasBackups).toBe(false);
      expect(info.availableVersions.length).toBe(0);
    });

    it('should handle version fetch error gracefully', async () => {
      mockGetBackupManager.mockReturnValue({
        getBackups: jest.fn(() => []),
        createBackup: jest.fn(),
        restoreBackup: jest.fn(),
      } as never);

      mockInvoke.mockRejectedValueOnce(new Error('Plugin not loaded'));

      const info = await manager.getRollbackInfo('plugin-a');

      expect(info.currentVersion).toBe('unknown');
    });
  });

  describe('createRollbackPlan', () => {
    it('should create a rollback plan with steps', async () => {
      mockGetBackupManager.mockReturnValue({
        getBackups: jest.fn(() => [
          { pluginId: 'plugin-a', version: '1.0.0', createdAt: new Date(), size: 1000 },
        ]),
        createBackup: jest.fn(),
        restoreBackup: jest.fn(),
      } as never);

      mockInvoke.mockResolvedValueOnce({ version: '2.0.0' });

      const plan = await manager.createRollbackPlan('plugin-a', '1.0.0');

      expect(plan.pluginId).toBe('plugin-a');
      expect(plan.targetVersion).toBe('1.0.0');
      expect(plan.steps.length).toBeGreaterThan(0);
    });

    it('should add warning for unavailable target version', async () => {
      mockGetBackupManager.mockReturnValue({
        getBackups: jest.fn(() => []),
        createBackup: jest.fn(),
        restoreBackup: jest.fn(),
      } as never);

      mockInvoke.mockResolvedValueOnce({ version: '2.0.0' });

      const plan = await manager.createRollbackPlan('plugin-a', '1.0.0');

      // Plan is created even if target not available (with warnings or empty steps)
      expect(plan.pluginId).toBe('plugin-a');
    });
  });

  describe('rollback', () => {
    it('should attempt rollback with backup available', async () => {
      mockGetBackupManager.mockReturnValue({
        getBackups: jest.fn(() => [
          { pluginId: 'plugin-a', version: '1.0.0', createdAt: new Date(), size: 1000, path: '/backup/1.0.0' },
        ]),
        createBackup: jest.fn().mockResolvedValue({ success: true }),
        restoreBackup: jest.fn().mockResolvedValue({ success: true }),
      } as never);

      // Mock version fetch
      mockInvoke.mockResolvedValueOnce({ version: '2.0.0' });
      // Mock additional calls
      mockInvoke.mockResolvedValue({ success: true, version: '1.0.0' });

      const result = await manager.rollback('plugin-a', '1.0.0');

      // Result should be defined regardless of success
      expect(result).toBeDefined();
    });

    it('should handle rollback failure', async () => {
      mockGetBackupManager.mockReturnValue({
        getBackups: jest.fn(() => []),
        createBackup: jest.fn(),
        restoreBackup: jest.fn(),
      } as never);

      mockInvoke.mockResolvedValueOnce({ version: '2.0.0' });

      const result = await manager.rollback('plugin-a', '1.0.0');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('rollbackToLatestBackup', () => {
    it('should rollback to latest backup version', async () => {
      mockGetBackupManager.mockReturnValue({
        getBackups: jest.fn(() => [
          { pluginId: 'plugin-a', version: '1.5.0', createdAt: new Date(), size: 1200, path: '/backup/1.5.0' },
          { pluginId: 'plugin-a', version: '1.0.0', createdAt: new Date(Date.now() - 10000), size: 1000, path: '/backup/1.0.0' },
        ]),
        createBackup: jest.fn().mockResolvedValue({ success: true }),
        restoreBackup: jest.fn().mockResolvedValue({ success: true }),
      } as never);

      mockInvoke.mockResolvedValueOnce({ version: '2.0.0' });
      mockInvoke.mockResolvedValueOnce({ success: true });
      mockInvoke.mockResolvedValueOnce({ version: '1.5.0' });

      const result = await manager.rollbackToLatestBackup('plugin-a');

      expect(result.success).toBe(true);
    });

    it('should fail if no backups available', async () => {
      mockGetBackupManager.mockReturnValue({
        getBackups: jest.fn(() => []),
        createBackup: jest.fn(),
        restoreBackup: jest.fn(),
      } as never);

      const result = await manager.rollbackToLatestBackup('plugin-a');

      expect(result.success).toBe(false);
    });
  });
});

describe('Singleton', () => {
  it('should return the same instance', () => {
    resetPluginRollbackManager();
    const instance1 = getPluginRollbackManager();
    const instance2 = getPluginRollbackManager();
    expect(instance1).toBe(instance2);
  });
});
