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

import { invoke } from '@tauri-apps/api/core';
const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

describe('PluginRollbackManager', () => {
  let manager: PluginRollbackManager;

  beforeEach(() => {
    resetPluginRollbackManager();
    manager = new PluginRollbackManager();
    mockInvoke.mockReset();
  });

  describe('Rollback Info', () => {
    it('should get rollback info', async () => {
      mockInvoke.mockResolvedValueOnce({
        pluginId: 'plugin-a',
        currentVersion: '2.0.0',
        availableVersions: ['1.0.0', '1.5.0'],
        canRollback: true,
      });

      const info = await manager.getRollbackInfo('plugin-a');

      expect(info.currentVersion).toBe('2.0.0');
      expect(info.availableVersions).toContain('1.0.0');
      expect(info.canRollback).toBe(true);
    });

    it('should indicate when rollback is not available', async () => {
      mockInvoke.mockResolvedValueOnce({
        pluginId: 'plugin-a',
        currentVersion: '1.0.0',
        availableVersions: [],
        canRollback: false,
      });

      const info = await manager.getRollbackInfo('plugin-a');

      expect(info.canRollback).toBe(false);
    });
  });

  describe('Rollback Planning', () => {
    it('should create a rollback plan', async () => {
      mockInvoke.mockResolvedValueOnce({
        pluginId: 'plugin-a',
        fromVersion: '2.0.0',
        toVersion: '1.0.0',
        steps: [
          { type: 'backup', description: 'Create backup of current version' },
          { type: 'restore', description: 'Restore previous version' },
          { type: 'migrate', description: 'Run migration scripts' },
        ],
        migrations: [],
        estimatedDuration: 5000,
      });

      const plan = await manager.createRollbackPlan('plugin-a', '1.0.0');

      expect(plan.fromVersion).toBe('2.0.0');
      expect(plan.toVersion).toBe('1.0.0');
      expect(plan.steps.length).toBe(3);
    });

    it('should include migrations in plan', async () => {
      mockInvoke.mockResolvedValueOnce({
        pluginId: 'plugin-a',
        fromVersion: '2.0.0',
        toVersion: '1.0.0',
        steps: [],
        migrations: [
          { version: '1.5.0', script: 'rollback_1_5_0.js' },
        ],
        estimatedDuration: 10000,
      });

      const plan = await manager.createRollbackPlan('plugin-a', '1.0.0');

      expect(plan.migrations.length).toBe(1);
    });
  });

  describe('Rollback Execution', () => {
    it('should execute rollback', async () => {
      mockInvoke.mockResolvedValueOnce({
        success: true,
        previousVersion: '2.0.0',
        restoredVersion: '1.0.0',
      });

      const result = await manager.executeRollback('plugin-a', '1.0.0');

      expect(result.success).toBe(true);
      expect(result.restoredVersion).toBe('1.0.0');
    });

    it('should handle rollback errors', async () => {
      mockInvoke.mockResolvedValueOnce({
        success: false,
        error: 'Migration script failed',
      });

      const result = await manager.executeRollback('plugin-a', '1.0.0');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Migration script failed');
    });

    it('should create backup before rollback', async () => {
      mockInvoke.mockResolvedValueOnce({
        success: true,
        backupCreated: true,
        restoredVersion: '1.0.0',
      });

      const result = await manager.executeRollback('plugin-a', '1.0.0', {
        createBackup: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Version History', () => {
    it('should get version history', async () => {
      mockInvoke.mockResolvedValueOnce([
        { version: '2.0.0', installedAt: new Date().toISOString() },
        { version: '1.5.0', installedAt: new Date().toISOString() },
        { version: '1.0.0', installedAt: new Date().toISOString() },
      ]);

      const history = await manager.getVersionHistory('plugin-a');

      expect(history.length).toBe(3);
      expect(history[0].version).toBe('2.0.0');
    });
  });

  describe('Version Compatibility', () => {
    it('should check version compatibility', async () => {
      mockInvoke.mockResolvedValueOnce({
        compatible: true,
        warnings: [],
      });

      const result = await manager.checkVersionCompatibility('plugin-a', '1.0.0');

      expect(result.compatible).toBe(true);
    });

    it('should return warnings for compatibility issues', async () => {
      mockInvoke.mockResolvedValueOnce({
        compatible: true,
        warnings: ['Some data may be lost'],
      });

      const result = await manager.checkVersionCompatibility('plugin-a', '1.0.0');

      expect(result.warnings.length).toBe(1);
    });

    it('should indicate incompatibility', async () => {
      mockInvoke.mockResolvedValueOnce({
        compatible: false,
        reason: 'Database schema incompatible',
      });

      const result = await manager.checkVersionCompatibility('plugin-a', '1.0.0');

      expect(result.compatible).toBe(false);
    });
  });

  describe('Quick Rollback', () => {
    it('should rollback to previous version', async () => {
      mockInvoke
        .mockResolvedValueOnce({
          pluginId: 'plugin-a',
          currentVersion: '2.0.0',
          availableVersions: ['1.5.0', '1.0.0'],
          canRollback: true,
        })
        .mockResolvedValueOnce({
          success: true,
          restoredVersion: '1.5.0',
        });

      const result = await manager.rollbackToPrevious('plugin-a');

      expect(result.success).toBe(true);
      expect(result.restoredVersion).toBe('1.5.0');
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
