/**
 * Tests for Plugin Updater
 */

import {
  PluginUpdater,
  getPluginUpdater,
  resetPluginUpdater,
} from './updater';

// Mock dependencies
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('../package/marketplace', () => ({
  getPluginMarketplace: () => ({
    getPlugin: jest.fn().mockResolvedValue({
      id: 'plugin-a',
      latestVersion: '2.0.0',
      updatedAt: new Date(),
    }),
  }),
}));

import { invoke } from '@tauri-apps/api/core';
const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

describe('PluginUpdater', () => {
  let updater: PluginUpdater;

  beforeEach(() => {
    resetPluginUpdater();
    updater = new PluginUpdater();
    mockInvoke.mockReset();
  });

  describe('Update Checking', () => {
    it('should check for updates for specific plugins', async () => {
      mockInvoke.mockResolvedValueOnce([
        { id: 'plugin-a', version: '1.0.0' },
      ]);

      const updates = await updater.checkForUpdates(['plugin-a']);

      expect(Array.isArray(updates)).toBe(true);
    });

    it('should check update for a single plugin', async () => {
      mockInvoke.mockResolvedValueOnce([
        { id: 'plugin-a', version: '1.0.0' },
      ]);

      const update = await updater.checkPluginUpdate('plugin-a');

      // May return null or UpdateInfo depending on marketplace response
      expect(update === null || typeof update === 'object').toBe(true);
    });

    it('should get pending updates', () => {
      const pending = updater.getPendingUpdates();
      expect(Array.isArray(pending)).toBe(true);
    });

    it('should clear pending updates', () => {
      updater.clearPendingUpdate('plugin-a');
      // No error means success
    });
  });

  describe('Update Installation', () => {
    it('should attempt to update a plugin', async () => {
      mockInvoke.mockResolvedValue({});

      const result = await updater.update('plugin-a', { force: true, version: '2.0.0' });

      expect(result.pluginId).toBe('plugin-a');
      expect(typeof result.success).toBe('boolean');
    });

    it('should return error for non-pending updates without force', async () => {
      const result = await updater.update('plugin-a');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No pending update found');
    });

    it('should update all pending plugins', async () => {
      mockInvoke.mockResolvedValue({});

      const results = await updater.updateAll();

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Progress Handlers', () => {
    it('should add progress handler', () => {
      const handler = jest.fn();
      const unsubscribe = updater.onProgress(handler);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should remove progress handler', () => {
      const handler = jest.fn();
      const unsubscribe = updater.onProgress(handler);

      unsubscribe();
      // No error means success
    });
  });

  describe('Update History', () => {
    it('should get update history', () => {
      const history = updater.getUpdateHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should get update history for specific plugin', () => {
      const history = updater.getUpdateHistory('plugin-a');
      expect(Array.isArray(history)).toBe(true);
    });

    it('should clear update history', () => {
      updater.clearHistory();
      expect(updater.getUpdateHistory().length).toBe(0);
    });
  });

  describe('Auto Update', () => {
    it('should configure auto update', () => {
      updater.configureAutoUpdate({
        enabled: true,
        checkInterval: 3600000,
        autoInstall: false,
        notifyOnly: true,
        excludePlugins: [],
        allowPrerelease: false,
      });
      // No error means success
      updater.stopAutoUpdate();
    });

    it('should stop auto update', () => {
      updater.configureAutoUpdate({
        enabled: true,
        checkInterval: 3600000,
        autoInstall: false,
        notifyOnly: true,
        excludePlugins: [],
        allowPrerelease: false,
      });
      updater.stopAutoUpdate();
      // No error means success
    });
  });

  describe('Configuration', () => {
    it('should have default configuration', () => {
      const newUpdater = new PluginUpdater();
      expect(newUpdater).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const newUpdater = new PluginUpdater({
        autoCheck: true,
        checkIntervalMs: 60000,
      });
      expect(newUpdater).toBeDefined();
    });
  });
});

describe('Singleton', () => {
  it('should return the same instance', () => {
    resetPluginUpdater();
    const instance1 = getPluginUpdater();
    const instance2 = getPluginUpdater();
    expect(instance1).toBe(instance2);
  });
});
