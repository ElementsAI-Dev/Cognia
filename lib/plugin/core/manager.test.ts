/**
 * PluginManager Tests
 */

import { invoke } from '@tauri-apps/api/core';
import { PluginManager } from './manager';
import type { Plugin, PluginManifest } from '@/types/plugin';
import { getPluginSignatureVerifier } from '@/lib/plugin/security/signature';
import { getPermissionGuard } from '@/lib/plugin/security/permission-guard';

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('@/stores/plugin', () => ({
  usePluginStore: {
    getState: jest.fn(),
  },
}));

jest.mock('@/lib/plugin/security/signature', () => ({
  getPluginSignatureVerifier: jest.fn(),
}));

jest.mock('@/lib/plugin/security/permission-guard', () => ({
  getPermissionGuard: jest.fn(),
}));

import { usePluginStore } from '@/stores/plugin';

describe('PluginManager', () => {
  const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;
  const mockGetState = usePluginStore.getState as unknown as jest.Mock;
  const mockVerifier = {
    verify: jest.fn(),
  };
  const mockGuard = {
    registerPlugin: jest.fn(),
    unregisterPlugin: jest.fn(),
  };

  const createManifest = (id: string): PluginManifest => ({
    id,
    name: `Plugin ${id}`,
    version: '1.0.0',
    description: 'Test plugin',
    type: 'frontend',
    capabilities: ['tools'],
    main: 'index.ts',
  });

  beforeEach(() => {
    mockInvoke.mockReset();
    mockGetState.mockReset();
    mockVerifier.verify.mockReset();
    mockVerifier.verify.mockResolvedValue({ valid: true });
    mockGuard.registerPlugin.mockReset();
    mockGuard.unregisterPlugin.mockReset();
    (getPluginSignatureVerifier as jest.Mock).mockReturnValue(mockVerifier);
    (getPermissionGuard as jest.Mock).mockReturnValue(mockGuard);
  });

  describe('installPlugin', () => {
    it('should call plugin_install with installType=git and write to store', async () => {
      const store: {
        plugins: Record<string, Plugin>;
        discoverPlugin: jest.Mock;
        installPlugin: jest.Mock;
      } = {
        plugins: {},
        discoverPlugin: jest.fn((manifest: PluginManifest, source: string, path: string) => {
          store.plugins[manifest.id] = {
            manifest,
            status: 'discovered',
            source: source as never,
            path,
            config: {},
          };
        }),
        installPlugin: jest.fn(async (pluginId: string) => {
          const p = store.plugins[pluginId];
          if (p) {
            store.plugins[pluginId] = {
              ...p,
              status: 'installed',
              installedAt: new Date(),
            };
          }
        }),
      };

      mockGetState.mockReturnValue(store);

      const manifest = createManifest('git-plugin');
      mockInvoke.mockResolvedValueOnce({
        manifest,
        path: '/plugins/git-plugin',
      });

      const manager = new PluginManager({ pluginDirectory: '/plugins' });

      const plugin = await manager.installPlugin('https://example.com/repo.git', { type: 'git' });

      expect(mockInvoke).toHaveBeenCalledWith('plugin_install', {
        source: 'https://example.com/repo.git',
        installType: 'git',
        pluginDir: '/plugins',
      });

      expect(store.discoverPlugin).toHaveBeenCalledWith(manifest, 'git', '/plugins/git-plugin');
      expect(store.installPlugin).toHaveBeenCalledWith('git-plugin');
      expect(plugin?.manifest.id).toBe('git-plugin');
      expect(plugin?.status).toBe('installed');
      expect(mockVerifier.verify).toHaveBeenCalledWith('/plugins/git-plugin');
    });

    it('should call plugin_install with installType=local when omitted', async () => {
      const store: {
        plugins: Record<string, Plugin>;
        discoverPlugin: jest.Mock;
        installPlugin: jest.Mock;
      } = {
        plugins: {},
        discoverPlugin: jest.fn((manifest: PluginManifest, source: string, path: string) => {
          store.plugins[manifest.id] = {
            manifest,
            status: 'discovered',
            source: source as never,
            path,
            config: {},
          };
        }),
        installPlugin: jest.fn(async (pluginId: string) => {
          const p = store.plugins[pluginId];
          if (p) {
            store.plugins[pluginId] = {
              ...p,
              status: 'installed',
              installedAt: new Date(),
            };
          }
        }),
      };

      mockGetState.mockReturnValue(store);

      const manifest = createManifest('local-plugin');
      mockInvoke.mockResolvedValueOnce({
        manifest,
        path: '/plugins/local-plugin',
      });

      const manager = new PluginManager({ pluginDirectory: '/plugins' });

      await manager.installPlugin('C:/some/folder');

      expect(mockInvoke).toHaveBeenCalledWith('plugin_install', {
        source: 'C:/some/folder',
        installType: 'local',
        pluginDir: '/plugins',
      });
      expect(mockVerifier.verify).toHaveBeenCalledWith('/plugins/local-plugin');
    });

    it('should throw a helpful error when invoke fails', async () => {
      const store: {
        plugins: Record<string, Plugin>;
        discoverPlugin: jest.Mock;
        installPlugin: jest.Mock;
      } = {
        plugins: {},
        discoverPlugin: jest.fn(),
        installPlugin: jest.fn(async () => undefined),
      };

      mockGetState.mockReturnValue(store);
      mockInvoke.mockRejectedValueOnce(new Error('boom'));

      const manager = new PluginManager({ pluginDirectory: '/plugins' });

      await expect(manager.installPlugin('https://example.com/repo.git', { type: 'git' })).rejects.toThrow(
        /Failed to install plugin/i
      );
    });
  });

  describe('scanPlugins', () => {
    it('should mark newly scanned plugins as installed in store', async () => {
      const store: {
        plugins: Record<string, Plugin>;
        discoverPlugin: jest.Mock;
        installPlugin: jest.Mock;
      } = {
        plugins: {},
        discoverPlugin: jest.fn((manifest: PluginManifest, source: string, path: string) => {
          store.plugins[manifest.id] = {
            manifest,
            status: 'discovered',
            source: source as never,
            path,
            config: {},
          };
        }),
        installPlugin: jest.fn(async (pluginId: string) => {
          const p = store.plugins[pluginId];
          if (p) {
            store.plugins[pluginId] = {
              ...p,
              status: 'installed',
              installedAt: new Date(),
            };
          }
        }),
      };

      mockGetState.mockReturnValue(store);

      const manifest = createManifest('scanned-plugin');
      mockInvoke.mockResolvedValueOnce([
        {
          manifest,
          path: '/plugins/scanned-plugin',
        },
      ]);

      const manager = new PluginManager({ pluginDirectory: '/plugins' });

      await manager.scanPlugins();

      expect(store.plugins['scanned-plugin']).toBeDefined();
      expect(store.plugins['scanned-plugin'].status).toBe('installed');
      expect(store.plugins['scanned-plugin'].installedAt).toEqual(expect.any(Date));
      expect(mockVerifier.verify).toHaveBeenCalledWith('/plugins/scanned-plugin');
    });

    it('should skip invalid manifests', async () => {
      const store: {
        plugins: Record<string, Plugin>;
        discoverPlugin: jest.Mock;
        installPlugin: jest.Mock;
      } = {
        plugins: {},
        discoverPlugin: jest.fn(),
        installPlugin: jest.fn(async () => undefined),
      };

      mockGetState.mockReturnValue(store);

      const invalidManifest: PluginManifest = {
        id: 'invalid-plugin',
        name: 'Invalid',
        version: '1.0.0',
        description: 'missing main',
        type: 'frontend',
        capabilities: ['tools'],
      };

      mockInvoke.mockResolvedValueOnce([
        {
          manifest: invalidManifest,
          path: '/plugins/invalid-plugin',
        },
      ]);

      const manager = new PluginManager({ pluginDirectory: '/plugins' });

      await manager.scanPlugins();

      expect(store.discoverPlugin).not.toHaveBeenCalled();
      expect(store.plugins['invalid-plugin']).toBeUndefined();
    });
  });

  describe('uninstallPlugin', () => {
    it('should call plugin_uninstall and then store.uninstallPlugin with skipFileRemoval=true', async () => {
      const manifest = createManifest('to-remove');

      const store: {
        plugins: Record<string, Plugin>;
        uninstallPlugin: jest.Mock;
        unloadPlugin: jest.Mock;
      } = {
        plugins: {
          'to-remove': {
            manifest,
            status: 'installed',
            source: 'local',
            path: '/plugins/to-remove',
            config: {},
          },
        },
        uninstallPlugin: jest.fn(async () => undefined),
        unloadPlugin: jest.fn(async () => undefined),
      };

      mockGetState.mockReturnValue(store);
      mockInvoke.mockResolvedValueOnce(undefined);

      const manager = new PluginManager({ pluginDirectory: '/plugins' });

      await manager.uninstallPlugin('to-remove');

      expect(mockInvoke).toHaveBeenCalledWith('plugin_uninstall', {
        pluginId: 'to-remove',
        pluginPath: '/plugins/to-remove',
      });

      expect(store.uninstallPlugin).toHaveBeenCalledWith('to-remove', { skipFileRemoval: true });
    });
  });
});
