/**
 * Plugin Store Tests
 */

import { act, renderHook } from '@testing-library/react';
import { usePluginStore } from './plugin-store';
import type { PluginManifest, PluginStatus as _PluginStatus } from '@/types/plugin';
import { invoke } from '@tauri-apps/api/core';

// Mock Tauri invoke
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

describe('usePluginStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => usePluginStore());
    act(() => {
      result.current.reset();
    });

    (invoke as jest.Mock).mockReset();
  });

  const createMockManifest = (id: string): PluginManifest => ({
    id,
    name: `Test Plugin ${id}`,
    version: '1.0.0',
    description: `Test plugin ${id} description`,
    type: 'frontend',
    capabilities: ['tools'],
    main: 'index.ts',
  });

  describe('initialization', () => {
    it('should have default state', () => {
      const { result } = renderHook(() => usePluginStore());
      
      expect(result.current.plugins).toEqual({});
      expect(result.current.initialized).toBe(false);
      expect(result.current.loading).toBeDefined();
      expect(result.current.errors).toEqual({});
    });

    it('should initialize store', async () => {
      const { result } = renderHook(() => usePluginStore());
      
      await act(async () => {
        await result.current.initialize('/test/plugins');
      });
      
      expect(result.current.initialized).toBe(true);
    });
  });

  describe('scanPlugins', () => {
    it('should call plugin_scan_directory with store pluginDirectory', async () => {
      (invoke as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => usePluginStore());

      await act(async () => {
        await result.current.initialize('/test/plugins');
        await result.current.scanPlugins();
      });

      expect(invoke).toHaveBeenCalledWith('plugin_scan_directory', {
        directory: '/test/plugins',
      });
    });

    it('should set newly scanned plugins to installed and set installedAt', async () => {
      const manifest = createMockManifest('scanned-plugin');

      (invoke as jest.Mock).mockResolvedValue([
        {
          manifest,
          path: '/test/plugins/scanned-plugin',
        },
      ]);

      const { result } = renderHook(() => usePluginStore());

      await act(async () => {
        await result.current.initialize('/test/plugins');
        await result.current.scanPlugins();
      });

      expect(result.current.plugins['scanned-plugin']).toBeDefined();
      expect(result.current.plugins['scanned-plugin'].status).toBe('installed');
      expect(result.current.plugins['scanned-plugin'].installedAt).toEqual(expect.any(Date));
    });

    it('should preserve existing plugin status when scanning again', async () => {
      const manifest = createMockManifest('existing-plugin');
      const { result } = renderHook(() => usePluginStore());

      await act(async () => {
        await result.current.initialize('/test/plugins');
        result.current.discoverPlugin(manifest, 'local', '/test/plugins/existing-plugin');
        result.current.setPluginStatus('existing-plugin', 'enabled');
      });

      (invoke as jest.Mock).mockResolvedValue([
        {
          manifest: { ...manifest, description: 'Updated description' },
          path: '/test/plugins/existing-plugin',
        },
      ]);

      await act(async () => {
        await result.current.scanPlugins();
      });

      expect(result.current.plugins['existing-plugin'].status).toBe('enabled');
      expect(result.current.plugins['existing-plugin'].manifest.description).toBe('Updated description');
    });
  });

  describe('plugin management', () => {
    it('should discover a plugin', () => {
      const { result } = renderHook(() => usePluginStore());
      const manifest = createMockManifest('test-plugin');
      
      act(() => {
        result.current.discoverPlugin(manifest, 'local', '/path/to/plugin');
      });
      
      expect(result.current.plugins['test-plugin']).toBeDefined();
      expect(result.current.plugins['test-plugin'].manifest.name).toBe('Test Plugin test-plugin');
    });

    it('should update plugin status', () => {
      const { result } = renderHook(() => usePluginStore());
      const manifest = createMockManifest('test-plugin');
      
      act(() => {
        result.current.discoverPlugin(manifest, 'local', '/path/to/plugin');
      });
      
      act(() => {
        result.current.setPluginStatus('test-plugin', 'enabled');
      });
      
      expect(result.current.plugins['test-plugin'].status).toBe('enabled');
    });

    it('should update plugin config', () => {
      const { result } = renderHook(() => usePluginStore());
      const manifest = createMockManifest('test-plugin');
      
      act(() => {
        result.current.discoverPlugin(manifest, 'local', '/path/to/plugin');
      });
      
      act(() => {
        result.current.setPluginConfig('test-plugin', { setting1: 'updated', setting2: 'new' });
      });
      
      expect(result.current.plugins['test-plugin'].config).toEqual({
        setting1: 'updated',
        setting2: 'new',
      });
    });

    it('should set plugin error', () => {
      const { result } = renderHook(() => usePluginStore());
      const manifest = createMockManifest('test-plugin');
      
      act(() => {
        result.current.discoverPlugin(manifest, 'local', '/path/to/plugin');
      });
      
      act(() => {
        result.current.setPluginError('test-plugin', 'Something went wrong');
      });
      
      expect(result.current.plugins['test-plugin'].status).toBe('error');
      expect(result.current.errors['test-plugin']).toBe('Something went wrong');
    });
  });

  describe('tool registration', () => {
    it('should register plugin tools', () => {
      const { result } = renderHook(() => usePluginStore());
      const manifest = createMockManifest('test-plugin');
      
      act(() => {
        result.current.discoverPlugin(manifest, 'local', '/path/to/plugin');
      });
      
      const mockTool = {
        name: 'test_tool',
        pluginId: 'test-plugin',
        definition: {
          name: 'test_tool',
          description: 'A test tool',
          parametersSchema: { type: 'object', properties: {} },
        },
        execute: jest.fn(),
      };
      
      act(() => {
        result.current.registerPluginTool('test-plugin', mockTool);
      });
      
      expect(result.current.plugins['test-plugin'].tools).toContainEqual(
        expect.objectContaining({ name: 'test_tool' })
      );
    });

    it('should unregister plugin tools', () => {
      const { result } = renderHook(() => usePluginStore());
      const manifest = createMockManifest('test-plugin');
      
      act(() => {
        result.current.discoverPlugin(manifest, 'local', '/path/to/plugin');
        result.current.registerPluginTool('test-plugin', {
          name: 'test_tool',
          pluginId: 'test-plugin',
          definition: { name: 'test_tool', description: '', parametersSchema: {} },
          execute: jest.fn(),
        });
      });
      
      act(() => {
        result.current.unregisterPluginTool('test-plugin', 'test_tool');
      });
      
      expect(result.current.plugins['test-plugin'].tools || []).not.toContainEqual(
        expect.objectContaining({ name: 'test_tool' })
      );
    });
  });

  describe('component registration', () => {
    it('should register plugin components', () => {
      const { result } = renderHook(() => usePluginStore());
      const manifest = createMockManifest('test-plugin');
      
      act(() => {
        result.current.discoverPlugin(manifest, 'local', '/path/to/plugin');
      });
      
      const mockComponent = {
        type: 'test-component',
        pluginId: 'test-plugin',
        component: () => null,
        metadata: {
          type: 'test-component',
          name: 'Test Component',
          description: 'A test component',
        },
      };
      
      act(() => {
        result.current.registerPluginComponent('test-plugin', mockComponent);
      });
      
      expect(result.current.plugins['test-plugin'].components).toContainEqual(
        expect.objectContaining({ type: 'test-component' })
      );
    });
  });

  describe('mode registration', () => {
    it('should register plugin modes', () => {
      const { result } = renderHook(() => usePluginStore());
      const manifest = createMockManifest('test-plugin');
      
      act(() => {
        result.current.discoverPlugin(manifest, 'local', '/path/to/plugin');
      });
      
      const mockMode = {
        id: 'test-mode',
        type: 'custom' as const,
        name: 'Test Mode',
        description: 'A test mode',
        icon: 'test',
        systemPrompt: 'You are a test assistant',
        tools: [],
      };
      
      act(() => {
        result.current.registerPluginMode('test-plugin', mockMode);
      });
      
      expect(result.current.plugins['test-plugin'].modes).toContainEqual(
        expect.objectContaining({ id: 'test-mode' })
      );
    });
  });

  describe('selectors', () => {
    it('should get enabled plugins', () => {
      const { result } = renderHook(() => usePluginStore());
      
      act(() => {
        result.current.discoverPlugin(createMockManifest('plugin-1'), 'local', '/path/to/plugin1');
        result.current.setPluginStatus('plugin-1', 'enabled');
        result.current.discoverPlugin(createMockManifest('plugin-2'), 'local', '/path/to/plugin2');
        result.current.setPluginStatus('plugin-2', 'disabled');
        result.current.discoverPlugin(createMockManifest('plugin-3'), 'local', '/path/to/plugin3');
        result.current.setPluginStatus('plugin-3', 'enabled');
      });
      
      const enabledPlugins = result.current.getEnabledPlugins();
      
      expect(enabledPlugins).toHaveLength(2);
      expect(enabledPlugins.map(p => p.manifest.id)).toContain('plugin-1');
      expect(enabledPlugins.map(p => p.manifest.id)).toContain('plugin-3');
    });

    it('should get plugins by capability', async () => {
      const { result } = renderHook(() => usePluginStore());
      
      await act(async () => {
        result.current.discoverPlugin(
          { ...createMockManifest('plugin-1'), capabilities: ['tools'] },
          'local',
          '/path/to/plugin1'
        );
        result.current.discoverPlugin(
          { ...createMockManifest('plugin-2'), capabilities: ['components'] },
          'local',
          '/path/to/plugin2'
        );
        result.current.discoverPlugin(
          { ...createMockManifest('plugin-3'), capabilities: ['tools', 'components'] },
          'local',
          '/path/to/plugin3'
        );
        // Enable the plugins so they appear in getPluginsByCapability
        result.current.setPluginStatus('plugin-1', 'enabled');
        result.current.setPluginStatus('plugin-2', 'enabled');
        result.current.setPluginStatus('plugin-3', 'enabled');
      });
      
      const toolPlugins = result.current.getPluginsByCapability('tools');
      
      expect(toolPlugins).toHaveLength(2);
      expect(toolPlugins.map(p => p.manifest.id)).toContain('plugin-1');
      expect(toolPlugins.map(p => p.manifest.id)).toContain('plugin-3');
    });

    it('should get all registered tools', async () => {
      const { result } = renderHook(() => usePluginStore());
      
      await act(async () => {
        result.current.discoverPlugin(createMockManifest('plugin-1'), 'local', '/path/to/plugin1');
        result.current.setPluginStatus('plugin-1', 'enabled');
        result.current.registerPluginTool('plugin-1', {
          name: 'tool1',
          pluginId: 'plugin-1',
          definition: { name: 'tool1', description: '', parametersSchema: {} },
          execute: jest.fn(),
        });
        result.current.discoverPlugin(createMockManifest('plugin-2'), 'local', '/path/to/plugin2');
        result.current.setPluginStatus('plugin-2', 'enabled');
        result.current.registerPluginTool('plugin-2', {
          name: 'tool2',
          pluginId: 'plugin-2',
          definition: { name: 'tool2', description: '', parametersSchema: {} },
          execute: jest.fn(),
        });
        result.current.registerPluginTool('plugin-2', {
          name: 'tool3',
          pluginId: 'plugin-2',
          definition: { name: 'tool3', description: '', parametersSchema: {} },
          execute: jest.fn(),
        });
      });
      
      const allTools = result.current.getAllTools();
      
      expect(allTools).toHaveLength(3);
      expect(allTools.map((t: { name: string }) => t.name)).toContain('tool1');
      expect(allTools.map((t: { name: string }) => t.name)).toContain('tool2');
      expect(allTools.map((t: { name: string }) => t.name)).toContain('tool3');
    });
  });

  describe('events', () => {
    it('should emit plugin events', () => {
      const { result } = renderHook(() => usePluginStore());
      const listener = jest.fn();
      
      act(() => {
        result.current.addEventListener('plugin:enabled', listener);
      });
      
      act(() => {
        result.current.emitEvent({
          type: 'plugin:enabled',
          pluginId: 'test-plugin',
        });
      });
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'plugin:enabled',
          pluginId: 'test-plugin',
        })
      );
    });

    it('should unsubscribe from events', () => {
      const { result } = renderHook(() => usePluginStore());
      const listener = jest.fn();
      
      let unsubscribe: () => void;
      act(() => {
        unsubscribe = result.current.addEventListener('plugin:enabled', listener);
      });
      
      act(() => {
        unsubscribe();
      });
      
      act(() => {
        result.current.emitEvent({
          type: 'plugin:enabled',
          pluginId: 'test-plugin',
        });
      });
      
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
