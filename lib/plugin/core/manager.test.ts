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

jest.mock('@/lib/chat/slash-command-registry', () => ({
  getCommand: jest.fn(),
  registerCommand: jest.fn(),
  unregisterCommand: jest.fn(),
}));

import { usePluginStore } from '@/stores/plugin';
import {
  getCommand as getSlashCommand,
  registerCommand as registerSlashCommand,
  unregisterCommand as unregisterSlashCommand,
} from '@/lib/chat/slash-command-registry';

describe('PluginManager', () => {
  const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;
  const mockGetState = usePluginStore.getState as unknown as jest.Mock;
  const mockVerifier = {
    verify: jest.fn(),
    getConfig: jest.fn().mockReturnValue({
      requireSignatures: false,
      allowUntrusted: true,
    }),
  };
  const mockGuard = {
    registerPlugin: jest.fn(),
    unregisterPlugin: jest.fn(),
    revokeAll: jest.fn(),
  };
  const mockGetSlashCommand = getSlashCommand as jest.MockedFunction<typeof getSlashCommand>;
  const mockRegisterSlashCommand = registerSlashCommand as jest.MockedFunction<typeof registerSlashCommand>;
  const mockUnregisterSlashCommand = unregisterSlashCommand as jest.MockedFunction<typeof unregisterSlashCommand>;

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
    mockGuard.revokeAll.mockReset();
    mockGetSlashCommand.mockReset();
    mockGetSlashCommand.mockReturnValue(undefined);
    mockRegisterSlashCommand.mockReset();
    mockUnregisterSlashCommand.mockReset();
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
      // With requireSignatures=false and allowUntrusted=true, verify is skipped
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
      // With requireSignatures=false and allowUntrusted=true, verify is skipped
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
      // With requireSignatures=false and allowUntrusted=true, verify is skipped
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

      expect(store.uninstallPlugin).toHaveBeenCalledWith('to-remove', {
        skipFileRemoval: true,
        viaManager: false,
      });
    });
  });

  describe('disablePlugin', () => {
    it('should call plugin deactivate and unregister contributions', async () => {
      const manifest = {
        ...createManifest('to-disable'),
        permissions: ['network:fetch'],
      };
      const store = {
        plugins: {
          'to-disable': {
            manifest,
            status: 'enabled',
            source: 'local',
            path: '/plugins/to-disable',
            config: {},
            tools: [
              {
                name: 'tool-a',
                pluginId: 'to-disable',
                definition: { name: 'tool-a', description: 'Tool A', parametersSchema: {} },
                execute: jest.fn(),
              },
            ],
            components: [
              {
                type: 'component-a',
                pluginId: 'to-disable',
                component: () => null,
                metadata: { type: 'component-a', name: 'Component A' },
              },
            ],
            modes: [
              {
                id: 'to-disable:mode-a',
                type: 'custom',
                name: 'Mode A',
                description: 'Mode A',
                icon: 'bot',
                tools: [],
              },
            ],
            commands: [
              {
                id: 'to-disable.command-a',
                name: 'Command A',
                execute: jest.fn(),
              },
            ],
          },
        } as Record<string, Plugin>,
        disablePlugin: jest.fn(async (pluginId: string) => {
          const plugin = store.plugins[pluginId];
          store.plugins[pluginId] = { ...plugin, status: 'disabled' } as Plugin;
        }),
        unregisterPluginTool: jest.fn(),
        unregisterPluginComponent: jest.fn(),
        unregisterPluginMode: jest.fn(),
        unregisterPluginCommand: jest.fn(),
      };

      mockGetState.mockReturnValue(store);
      mockInvoke.mockResolvedValue(undefined);

      const manager = new PluginManager({ pluginDirectory: '/plugins' });
      const deactivate = jest.fn(async () => undefined);
      (manager as unknown as {
        loader: { loadedModules: Map<string, { definition: { deactivate: () => Promise<void> } }> };
      }).loader.loadedModules.set('to-disable', {
        definition: { deactivate },
      });

      await manager.disablePlugin('to-disable');

      expect(store.disablePlugin).toHaveBeenCalledWith('to-disable', { viaManager: false });
      expect(store.unregisterPluginTool).toHaveBeenCalledWith('to-disable', 'tool-a');
      expect(store.unregisterPluginComponent).toHaveBeenCalledWith('to-disable', 'component-a');
      expect(store.unregisterPluginMode).toHaveBeenCalledWith('to-disable', 'to-disable:mode-a');
      expect(store.unregisterPluginCommand).toHaveBeenCalledWith('to-disable', 'to-disable.command-a');
      expect(deactivate).toHaveBeenCalled();
      expect(mockGuard.revokeAll).toHaveBeenCalledWith('to-disable');
    });
  });

  describe('handleActivationEvent', () => {
    it('should activate plugin when command activation event matches', async () => {
      const pluginA: Plugin = {
        manifest: {
          ...createManifest('event-plugin'),
          activationEvents: ['onCommand:test-command'],
        },
        status: 'installed',
        source: 'local',
        path: '/plugins/event-plugin',
        config: {},
      };
      const pluginB: Plugin = {
        manifest: {
          ...createManifest('other-plugin'),
          activationEvents: ['onCommand:other-command'],
        },
        status: 'installed',
        source: 'local',
        path: '/plugins/other-plugin',
        config: {},
      };

      mockGetState.mockReturnValue({
        plugins: {
          'event-plugin': pluginA,
          'other-plugin': pluginB,
        },
      });

      const manager = new PluginManager({ pluginDirectory: '/plugins' });
      const enableSpy = jest
        .spyOn(manager, 'enablePlugin')
        .mockResolvedValue(undefined);

      await manager.handleActivationEvent('onCommand:test-command');

      expect(enableSpy).toHaveBeenCalledWith('event-plugin', 'activation:onCommand:test-command');
      expect(enableSpy).not.toHaveBeenCalledWith('other-plugin', expect.any(String));
    });

    it('should activate plugin when wildcard command activation event matches', async () => {
      const wildcardPlugin: Plugin = {
        manifest: {
          ...createManifest('wildcard-plugin'),
          activationEvents: ['onCommand:git-tools.*'],
        },
        status: 'installed',
        source: 'local',
        path: '/plugins/wildcard-plugin',
        config: {},
      };

      mockGetState.mockReturnValue({
        plugins: {
          'wildcard-plugin': wildcardPlugin,
        },
      });

      const manager = new PluginManager({ pluginDirectory: '/plugins' });
      const enableSpy = jest.spyOn(manager, 'enablePlugin').mockResolvedValue(undefined);

      await manager.handleActivationEvent('onCommand:git-tools.status');

      expect(enableSpy).toHaveBeenCalledWith(
        'wildcard-plugin',
        'activation:onCommand:git-tools.status'
      );
    });

    it('should activate plugin on startup event when activateOnStartup=true', async () => {
      const startupPlugin: Plugin = {
        manifest: {
          ...createManifest('startup-plugin'),
          activateOnStartup: true,
        },
        status: 'installed',
        source: 'local',
        path: '/plugins/startup-plugin',
        config: {},
      };

      mockGetState.mockReturnValue({
        plugins: {
          'startup-plugin': startupPlugin,
        },
      });

      const manager = new PluginManager({ pluginDirectory: '/plugins' });
      const enableSpy = jest.spyOn(manager, 'enablePlugin').mockResolvedValue(undefined);

      await manager.handleActivationEvent('startup');

      expect(enableSpy).toHaveBeenCalledWith('startup-plugin', 'activation:startup');
    });

    it('should activate plugin for legacy onAgentTool activation events', async () => {
      const legacyToolPlugin: Plugin = {
        manifest: {
          ...createManifest('legacy-tool-plugin'),
          activationEvents: ['onAgentTool:docker_*'],
        },
        status: 'installed',
        source: 'local',
        path: '/plugins/legacy-tool-plugin',
        config: {},
      };

      mockGetState.mockReturnValue({
        plugins: {
          'legacy-tool-plugin': legacyToolPlugin,
        },
      });

      const manager = new PluginManager({ pluginDirectory: '/plugins' });
      const enableSpy = jest.spyOn(manager, 'enablePlugin').mockResolvedValue(undefined);

      await manager.handleActivationEvent('onTool:docker_ps');

      expect(enableSpy).toHaveBeenCalledWith(
        'legacy-tool-plugin',
        'activation:onTool:docker_ps'
      );
    });
  });

  describe('plugin slash command integration', () => {
    const createCommandPlugin = (status: Plugin['status'] = 'loaded'): Plugin => ({
      manifest: {
        ...createManifest('cmd-plugin'),
        capabilities: ['commands'],
        commands: [
          {
            id: 'cmd-plugin.run',
            name: 'Run Command',
            description: 'Execute plugin command',
            aliases: ['cmd-run', 'cmd-alias'],
          },
        ],
      },
      status,
      source: 'local',
      path: '/plugins/cmd-plugin',
      config: {},
    });

    it('should register slash commands when plugin is enabled', async () => {
      const store = {
        plugins: {
          'cmd-plugin': createCommandPlugin('loaded'),
        } as Record<string, Plugin>,
        enablePlugin: jest.fn(async (pluginId: string) => {
          const plugin = store.plugins[pluginId];
          store.plugins[pluginId] = { ...plugin, status: 'enabled' };
        }),
        registerPluginCommand: jest.fn(),
      };

      mockGetState.mockReturnValue(store);
      const manager = new PluginManager({ pluginDirectory: '/plugins' });
      (manager as unknown as { contexts: Map<string, unknown> }).contexts.set('cmd-plugin', {});
      (manager as unknown as { loader: { isLoaded: (pluginId: string) => boolean } }).loader.isLoaded =
        jest.fn(() => true);

      await manager.enablePlugin('cmd-plugin');

      expect(store.enablePlugin).toHaveBeenCalledWith('cmd-plugin', { viaManager: false });
      expect(store.registerPluginCommand).toHaveBeenCalledWith(
        'cmd-plugin',
        expect.objectContaining({ id: 'cmd-plugin.cmd-plugin.run' })
      );
      expect(mockRegisterSlashCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'cmd-plugin.cmd-plugin.run',
          source: 'plugin',
          command: 'cmd-plugin.run',
          aliases: ['cmd-run', 'cmd-alias'],
          pluginMeta: {
            source: 'plugin',
            pluginId: 'cmd-plugin',
            commandId: 'cmd-plugin.run',
          },
        })
      );
    });

    it('should unregister slash commands when plugin is disabled', async () => {
      const store = {
        plugins: {
          'cmd-plugin': {
            ...createCommandPlugin('enabled'),
            commands: [
              {
                id: 'cmd-plugin.cmd-plugin.run',
                name: 'Run Command',
                execute: jest.fn(),
              },
            ],
          },
        } as Record<string, Plugin>,
        disablePlugin: jest.fn(async (pluginId: string) => {
          const plugin = store.plugins[pluginId];
          store.plugins[pluginId] = { ...plugin, status: 'disabled' };
        }),
        unregisterPluginCommand: jest.fn(),
      };

      mockGetState.mockReturnValue(store);
      const manager = new PluginManager({ pluginDirectory: '/plugins' });
      (manager as unknown as {
        registeredSlashCommandsByPlugin: Map<string, string[]>;
      }).registeredSlashCommandsByPlugin.set('cmd-plugin', ['cmd-plugin.run']);

      await manager.disablePlugin('cmd-plugin');

      expect(store.disablePlugin).toHaveBeenCalledWith('cmd-plugin', { viaManager: false });
      expect(mockUnregisterSlashCommand).toHaveBeenCalledWith('cmd-plugin.run');
    });

    it('should skip conflicting slash alias while registering non-conflicting aliases', async () => {
      const store = {
        plugins: {
          'cmd-plugin': createCommandPlugin('loaded'),
        } as Record<string, Plugin>,
        enablePlugin: jest.fn(async (pluginId: string) => {
          const plugin = store.plugins[pluginId];
          store.plugins[pluginId] = { ...plugin, status: 'enabled' };
        }),
        registerPluginCommand: jest.fn(),
      };

      mockGetState.mockReturnValue(store);
      mockGetSlashCommand.mockImplementation((name: string) =>
        name === 'cmd-alias'
          ? ({
              id: 'existing',
              command: 'existing',
              description: 'existing',
              category: 'custom',
              handler: async () => ({ success: true }),
            } as never)
          : undefined
      );

      const manager = new PluginManager({ pluginDirectory: '/plugins' });
      (manager as unknown as { contexts: Map<string, unknown> }).contexts.set('cmd-plugin', {});
      (manager as unknown as { loader: { isLoaded: (pluginId: string) => boolean } }).loader.isLoaded =
        jest.fn(() => true);

      await manager.enablePlugin('cmd-plugin');

      expect(mockRegisterSlashCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'cmd-plugin.run',
          aliases: ['cmd-run'],
        })
      );
    });
  });
});
