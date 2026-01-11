/**
 * Tests for Plugin Backup Manager
 */

import {
  PluginBackupManager,
  getPluginBackupManager,
  resetPluginBackupManager,
} from './backup';

// Mock Tauri invoke
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

describe('PluginBackupManager', () => {
  let manager: PluginBackupManager;

  beforeEach(() => {
    resetPluginBackupManager();
    manager = new PluginBackupManager();
    mockInvoke.mockReset();
  });

  describe('Backup Creation', () => {
    it('should create a backup', async () => {
      mockInvoke.mockResolvedValueOnce({
        id: 'backup-1',
        pluginId: 'plugin-a',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        reason: 'manual',
        size: 1024,
        path: '/backups/backup-1',
      });

      const backup = await manager.createBackup('plugin-a', '1.0.0', 'manual');

      expect(backup.pluginId).toBe('plugin-a');
      expect(backup.version).toBe('1.0.0');
      expect(backup.reason).toBe('manual');
    });

    it('should include metadata in backup', async () => {
      mockInvoke.mockResolvedValueOnce({
        id: 'backup-1',
        pluginId: 'plugin-a',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        reason: 'update',
        size: 1024,
        path: '/backups/backup-1',
        metadata: { previousVersion: '0.9.0' },
      });

      const backup = await manager.createBackup('plugin-a', '1.0.0', 'update', {
        previousVersion: '0.9.0',
      });

      expect(backup.metadata?.previousVersion).toBe('0.9.0');
    });
  });

  describe('Backup Listing', () => {
    it('should list backups for a plugin', async () => {
      mockInvoke.mockResolvedValueOnce([
        { id: 'backup-1', pluginId: 'plugin-a', version: '1.0.0' },
        { id: 'backup-2', pluginId: 'plugin-a', version: '0.9.0' },
      ]);

      const backups = await manager.listBackups('plugin-a');

      expect(backups.length).toBe(2);
    });

    it('should get a specific backup', async () => {
      mockInvoke.mockResolvedValueOnce({
        id: 'backup-1',
        pluginId: 'plugin-a',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
      });

      const backup = await manager.getBackup('plugin-a', 'backup-1');

      expect(backup?.id).toBe('backup-1');
    });

    it('should return null for non-existent backup', async () => {
      mockInvoke.mockResolvedValueOnce(null);

      const backup = await manager.getBackup('plugin-a', 'non-existent');

      expect(backup).toBeNull();
    });
  });

  describe('Backup Restoration', () => {
    it('should restore from backup', async () => {
      mockInvoke.mockResolvedValueOnce({
        success: true,
        restoredVersion: '1.0.0',
      });

      const result = await manager.restoreBackup('plugin-a', 'backup-1');

      expect(result.success).toBe(true);
    });

    it('should handle restore errors', async () => {
      mockInvoke.mockResolvedValueOnce({
        success: false,
        error: 'Backup file corrupted',
      });

      const result = await manager.restoreBackup('plugin-a', 'backup-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Backup file corrupted');
    });
  });

  describe('Backup Deletion', () => {
    it('should delete a backup', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await manager.deleteBackup('plugin-a', 'backup-1');

      expect(mockInvoke).toHaveBeenCalledWith('plugin_delete_backup', {
        pluginId: 'plugin-a',
        backupId: 'backup-1',
      });
    });

    it('should delete all backups for a plugin', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await manager.deleteAllBackups('plugin-a');

      expect(mockInvoke).toHaveBeenCalledWith('plugin_delete_all_backups', {
        pluginId: 'plugin-a',
      });
    });
  });

  describe('Auto Backup', () => {
    it('should check if auto backup is enabled', () => {
      // Default state
      expect(manager.isAutoBackupEnabled()).toBe(true);
    });

    it('should toggle auto backup', () => {
      manager.setAutoBackupEnabled(false);
      expect(manager.isAutoBackupEnabled()).toBe(false);

      manager.setAutoBackupEnabled(true);
      expect(manager.isAutoBackupEnabled()).toBe(true);
    });
  });

  describe('Backup Size', () => {
    it('should get total backup size', async () => {
      mockInvoke.mockResolvedValueOnce(10240);

      const size = await manager.getTotalBackupSize('plugin-a');

      expect(size).toBe(10240);
    });

    it('should get total backup size for all plugins', async () => {
      mockInvoke.mockResolvedValueOnce(102400);

      const size = await manager.getTotalBackupSize();

      expect(size).toBe(102400);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old backups', async () => {
      mockInvoke.mockResolvedValueOnce({ deleted: 5 });

      await manager.cleanupOldBackups('plugin-a', 3);

      expect(mockInvoke).toHaveBeenCalledWith('plugin_cleanup_backups', {
        pluginId: 'plugin-a',
        keepCount: 3,
      });
    });
  });
});

describe('Singleton', () => {
  it('should return the same instance', () => {
    resetPluginBackupManager();
    const instance1 = getPluginBackupManager();
    const instance2 = getPluginBackupManager();
    expect(instance1).toBe(instance2);
  });
});
