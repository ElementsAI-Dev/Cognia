/**
 * Tests for manager.ts
 * Plugin Manager - Core plugin lifecycle management
 */

import { PluginManager, getPluginManager, initializePluginManager } from './manager';
import { invoke } from '@tauri-apps/api/core';
import { usePluginStore } from '@/stores/plugin';
import { PluginLoader } from './loader';
import { PluginRegistry } from './registry';
import { PluginHooksManager } from './hooks';
import { validatePluginManifest as validatePluginManifestOriginal } from './validation';
import type { Plugin, PluginManifest } from '@/types/plugin';

const validatePluginManifest = validatePluginManifestOriginal as jest.MockedFunction<typeof validatePluginManifestOriginal>;

// Mock Tauri invoke
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

// Mock plugin store
jest.mock('@/stores/plugin', () => ({
  usePluginStore: {
    getState: jest.fn(),
  },
}));

// Mock PluginLoader
jest.mock('./loader');

// Mock validation
jest.mock('./validation', () => ({
  validatePluginManifest: jest.fn().mockReturnValue({ valid: true, errors: [] }),
}));

// Mock context creation
jest.mock('./context', () => ({
  createFullPluginContext: jest.fn().mockReturnValue({}),
}));

const mockedInvoke = invoke as jest.MockedFunction<typeof invoke>;
const mockedUsePluginStore = usePluginStore as jest.Mocked<typeof usePluginStore>;

describe('PluginManager', () => {
  let manager: PluginManager;
  let mockStore: {
    initialize: jest.Mock;
    plugins: Record<string, Plugin>;
    discoverPlugin: jest.Mock;
    installPlugin: jest.Mock;
    loadPlugin: jest.Mock;
    enablePlugin: jest.Mock;
    disablePlugin: jest.Mock;
    unloadPlugin: jest.Mock;
    uninstallPlugin: jest.Mock;
    setPluginError: jest.Mock;
    registerPluginHooks: jest.Mock;
    registerPluginTool: jest.Mock;
    unregisterPluginTool: jest.Mock;
    registerPluginMode: jest.Mock;
    unregisterPluginMode: jest.Mock;
    unregisterPluginComponent: jest.Mock;
    unregisterPluginCommand: jest.Mock;
  };

  const createMockManifest = (id: string): PluginManifest => ({
    id,
    name: `Plugin ${id}`,
    version: '1.0.0',
    type: 'frontend',
    permissions: [],
    main: 'index.js',
    description: `Mock plugin ${id}`,
    capabilities: [],
  });

  const createMockPlugin = (id: string, status: Plugin['status'] = 'installed'): Plugin => ({
    manifest: createMockManifest(id),
    path: `/plugins/${id}`,
    source: 'local',
    status,
    installedAt: new Date(),
    config: {},
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockStore = {
      initialize: jest.fn(),
      plugins: {},
      discoverPlugin: jest.fn(),
      installPlugin: jest.fn(),
      loadPlugin: jest.fn(),
      enablePlugin: jest.fn(),
      disablePlugin: jest.fn(),
      unloadPlugin: jest.fn(),
      uninstallPlugin: jest.fn(),
      setPluginError: jest.fn(),
      registerPluginHooks: jest.fn(),
      registerPluginTool: jest.fn(),
      unregisterPluginTool: jest.fn(),
      registerPluginMode: jest.fn(),
      unregisterPluginMode: jest.fn(),
      unregisterPluginComponent: jest.fn(),
      unregisterPluginCommand: jest.fn(),
    };

    mockedUsePluginStore.getState.mockReturnValue(mockStore as never);

    manager = new PluginManager({
      pluginDirectory: '/plugins',
      autoEnable: false,
    });
  });

  describe('initialize', () => {
    it('should initialize the plugin store', async () => {
      mockedInvoke.mockResolvedValue([]);

      await manager.initialize();

      expect(mockStore.initialize).toHaveBeenCalledWith('/plugins');
    });

    it('should scan for plugins', async () => {
      mockedInvoke.mockResolvedValue([]);

      await manager.initialize();

      expect(mockedInvoke).toHaveBeenCalledWith('plugin_scan_directory', {
        directory: '/plugins',
      });
    });

    it('should initialize Python runtime when enabled', async () => {
      const pythonManager = new PluginManager({
        pluginDirectory: '/plugins',
        enablePython: true,
        pythonPath: '/usr/bin/python3',
      });

      mockedInvoke.mockResolvedValue([]);

      await pythonManager.initialize();

      expect(mockedInvoke).toHaveBeenCalledWith('plugin_python_initialize', {
        pythonPath: '/usr/bin/python3',
      });
    });

    it('should not initialize twice', async () => {
      mockedInvoke.mockResolvedValue([]);

      await manager.initialize();
      await manager.initialize();

      expect(mockStore.initialize).toHaveBeenCalledTimes(1);
    });

    it('should auto-enable plugins when configured', async () => {
      const autoManager = new PluginManager({
        pluginDirectory: '/plugins',
        autoEnable: true,
      });

      const plugin = createMockPlugin('auto-enable', 'installed');
      mockStore.plugins = { 'auto-enable': plugin };

      mockedInvoke.mockResolvedValue([]);
      (PluginLoader.prototype.load as jest.Mock).mockResolvedValue({
        activate: jest.fn().mockResolvedValue({}),
      });

      await autoManager.initialize();

      expect(mockStore.loadPlugin).toHaveBeenCalled();
      expect(mockStore.enablePlugin).toHaveBeenCalled();
    });
  });

  describe('scanPlugins', () => {
    it('should discover local plugins', async () => {
      const manifest = createMockManifest('discovered');
      mockedInvoke.mockResolvedValue([{ manifest, path: '/plugins/discovered' }]);

      const discovered = await manager.scanPlugins();

      expect(discovered).toHaveLength(1);
      expect(discovered[0].manifest.id).toBe('discovered');
      expect(mockStore.discoverPlugin).toHaveBeenCalledWith(manifest, 'local', '/plugins/discovered');
    });

    it('should skip plugins with invalid manifests', async () => {
      validatePluginManifest.mockReturnValueOnce({ valid: false, errors: ['Invalid'], warnings: [] });

      mockedInvoke.mockResolvedValue([{ manifest: {}, path: '/plugins/invalid' }]);

      const discovered = await manager.scanPlugins();

      expect(discovered).toHaveLength(0);
    });

    it('should handle scan errors gracefully', async () => {
      mockedInvoke.mockRejectedValue(new Error('Scan failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const discovered = await manager.scanPlugins();

      expect(discovered).toHaveLength(0);
      consoleSpy.mockRestore();
    });
  });

  describe('installPlugin', () => {
    it('should install plugin from source', async () => {
      const manifest = createMockManifest('new-plugin');
      mockedInvoke.mockResolvedValue({ manifest, path: '/plugins/new-plugin' });
      mockStore.plugins['new-plugin'] = createMockPlugin('new-plugin');

      await manager.installPlugin('/path/to/plugin.zip');

      expect(mockedInvoke).toHaveBeenCalledWith('plugin_install', expect.any(Object));
      expect(mockStore.installPlugin).toHaveBeenCalledWith('new-plugin');
    });

    it('should throw on invalid manifest', async () => {
      validatePluginManifest.mockReturnValueOnce({ valid: false, errors: ['Error 1'], warnings: [] });

      mockedInvoke.mockResolvedValue({ manifest: {}, path: '/plugins/invalid' });

      await expect(manager.installPlugin('/path/to/plugin')).rejects.toThrow('Invalid plugin manifest');
    });
  });

  describe('loadPlugin', () => {
    it('should load plugin module', async () => {
      const plugin = createMockPlugin('to-load');
      mockStore.plugins['to-load'] = plugin;

      (PluginLoader.prototype.load as jest.Mock).mockResolvedValue({
        activate: jest.fn().mockResolvedValue({ onLoad: jest.fn() }),
      });

      await manager.loadPlugin('to-load');

      expect(mockStore.loadPlugin).toHaveBeenCalledWith('to-load');
      expect(mockStore.registerPluginHooks).toHaveBeenCalled();
    });

    it('should throw for unknown plugin', async () => {
      await expect(manager.loadPlugin('unknown')).rejects.toThrow('Plugin not found');
    });

    it('should set error on load failure', async () => {
      const plugin = createMockPlugin('fail-load');
      mockStore.plugins['fail-load'] = plugin;

      (PluginLoader.prototype.load as jest.Mock).mockRejectedValue(new Error('Load error'));

      await expect(manager.loadPlugin('fail-load')).rejects.toThrow();
      expect(mockStore.setPluginError).toHaveBeenCalledWith('fail-load', expect.any(String));
    });
  });

  describe('enablePlugin', () => {
    it('should enable plugin', async () => {
      const plugin = createMockPlugin('to-enable', 'loaded');
      mockStore.plugins['to-enable'] = plugin;

      await manager.enablePlugin('to-enable');

      expect(mockStore.enablePlugin).toHaveBeenCalledWith('to-enable');
    });

    it('should load plugin first if not loaded', async () => {
      const plugin = createMockPlugin('not-loaded', 'installed');
      mockStore.plugins['not-loaded'] = plugin;

      (PluginLoader.prototype.load as jest.Mock).mockResolvedValue({
        activate: jest.fn().mockResolvedValue({}),
      });

      await manager.enablePlugin('not-loaded');

      expect(mockStore.loadPlugin).toHaveBeenCalled();
      expect(mockStore.enablePlugin).toHaveBeenCalled();
    });
  });

  describe('disablePlugin', () => {
    it('should disable plugin', async () => {
      const plugin = createMockPlugin('to-disable', 'enabled');
      mockStore.plugins['to-disable'] = plugin;

      await manager.disablePlugin('to-disable');

      expect(mockStore.disablePlugin).toHaveBeenCalledWith('to-disable');
    });
  });

  describe('unloadPlugin', () => {
    it('should unload plugin', async () => {
      const plugin = createMockPlugin('to-unload', 'loaded');
      mockStore.plugins['to-unload'] = plugin;

      await manager.unloadPlugin('to-unload');

      expect(mockStore.unloadPlugin).toHaveBeenCalledWith('to-unload');
    });

    it('should disable first if enabled', async () => {
      const plugin = createMockPlugin('enabled-unload', 'enabled');
      mockStore.plugins['enabled-unload'] = plugin;

      await manager.unloadPlugin('enabled-unload');

      expect(mockStore.disablePlugin).toHaveBeenCalledWith('enabled-unload');
      expect(mockStore.unloadPlugin).toHaveBeenCalledWith('enabled-unload');
    });
  });

  describe('uninstallPlugin', () => {
    it('should uninstall plugin', async () => {
      const plugin = createMockPlugin('to-uninstall', 'installed');
      mockStore.plugins['to-uninstall'] = plugin;

      await manager.uninstallPlugin('to-uninstall');

      expect(mockedInvoke).toHaveBeenCalledWith('plugin_uninstall', expect.any(Object));
      expect(mockStore.uninstallPlugin).toHaveBeenCalledWith('to-uninstall');
    });

    it('should throw for unknown plugin', async () => {
      await expect(manager.uninstallPlugin('unknown')).rejects.toThrow('Plugin not found');
    });

    it('should unload first if loaded', async () => {
      const plugin = createMockPlugin('loaded-uninstall', 'loaded');
      mockStore.plugins['loaded-uninstall'] = plugin;

      await manager.uninstallPlugin('loaded-uninstall');

      expect(mockStore.unloadPlugin).toHaveBeenCalled();
    });
  });

  describe('Python Plugin Support', () => {
    describe('loadPythonPlugin', () => {
      it('should load Python plugin via Tauri', async () => {
        const plugin = createMockPlugin('python-plugin');
        plugin.manifest.type = 'python';
        plugin.manifest.pythonMain = 'main.py';
        mockStore.plugins['python-plugin'] = plugin;

        mockedInvoke
          .mockResolvedValueOnce(undefined) // plugin_python_load
          .mockResolvedValueOnce([]); // plugin_python_get_tools

        await manager.loadPythonPlugin('python-plugin');

        expect(mockedInvoke).toHaveBeenCalledWith('plugin_python_load', expect.any(Object));
      });

      it('should register Python tools', async () => {
        const plugin = createMockPlugin('python-tools');
        plugin.manifest.type = 'python';
        mockStore.plugins['python-tools'] = plugin;

        mockedInvoke
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce([
            { name: 'tool1', description: 'Tool 1', parameters: {} },
          ]);

        await manager.loadPythonPlugin('python-tools');

        expect(mockStore.registerPluginTool).toHaveBeenCalled();
      });

      it('should throw for frontend plugin', async () => {
        const plugin = createMockPlugin('frontend');
        mockStore.plugins['frontend'] = plugin;

        await expect(manager.loadPythonPlugin('frontend')).rejects.toThrow('not a Python plugin');
      });
    });

    describe('callPythonFunction', () => {
      it('should call Python function via Tauri', async () => {
        mockedInvoke.mockResolvedValue('result');

        const result = await manager.callPythonFunction('plugin', 'func', [1, 2]);

        expect(mockedInvoke).toHaveBeenCalledWith('plugin_python_call', {
          pluginId: 'plugin',
          functionName: 'func',
          args: [1, 2],
        });
        expect(result).toBe('result');
      });
    });
  });

  describe('Utilities', () => {
    describe('getPlugin', () => {
      it('should return plugin from store', () => {
        const plugin = createMockPlugin('get-test');
        mockStore.plugins['get-test'] = plugin;

        expect(manager.getPlugin('get-test')).toBe(plugin);
      });

      it('should return undefined for unknown plugin', () => {
        expect(manager.getPlugin('unknown')).toBeUndefined();
      });
    });

    describe('getPluginContext', () => {
      it('should return context for loaded plugin', async () => {
        const plugin = createMockPlugin('with-context');
        mockStore.plugins['with-context'] = plugin;

        (PluginLoader.prototype.load as jest.Mock).mockResolvedValue({
          activate: jest.fn().mockResolvedValue({}),
        });

        await manager.loadPlugin('with-context');

        expect(manager.getPluginContext('with-context')).toBeDefined();
      });

      it('should return undefined for not-loaded plugin', () => {
        expect(manager.getPluginContext('not-loaded')).toBeUndefined();
      });
    });

    describe('getRegistry', () => {
      it('should return plugin registry', () => {
        expect(manager.getRegistry()).toBeInstanceOf(PluginRegistry);
      });
    });

    describe('getHooksManager', () => {
      it('should return hooks manager', () => {
        expect(manager.getHooksManager()).toBeInstanceOf(PluginHooksManager);
      });
    });

    describe('isInitialized', () => {
      it('should return false before initialization', () => {
        expect(manager.isInitialized()).toBe(false);
      });

      it('should return true after initialization', async () => {
        mockedInvoke.mockResolvedValue([]);
        await manager.initialize();

        expect(manager.isInitialized()).toBe(true);
      });
    });
  });
});

describe('Singleton Functions', () => {
  beforeEach(() => {
    // Reset singleton
    jest.resetModules();
  });

  describe('getPluginManager', () => {
    it('should throw if not initialized', () => {
      expect(() => getPluginManager()).toThrow('not initialized');
    });
  });

  describe('initializePluginManager', () => {
    it('should create and return manager instance', async () => {
      mockedInvoke.mockResolvedValue([]);

      const manager = await initializePluginManager({
        pluginDirectory: '/plugins',
      });

      expect(manager).toBeInstanceOf(PluginManager);
    });

    it('should return same instance on subsequent calls', async () => {
      mockedInvoke.mockResolvedValue([]);

      const manager1 = await initializePluginManager({ pluginDirectory: '/plugins' });
      const manager2 = await initializePluginManager({ pluginDirectory: '/other' });

      expect(manager1).toBe(manager2);
    });
  });
});
