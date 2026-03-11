import { invoke } from '@tauri-apps/api/core';
import fs from 'fs';
import path from 'path';
import { PluginManager } from '@/lib/plugin/core/manager';
import type { Plugin, PluginManifest } from '@/types/plugin';
import { getPluginSignatureVerifier } from '@/lib/plugin/security/signature';
import { getPermissionGuard } from '@/lib/plugin/security/permission-guard';
import {
  clearPluginExtensions,
  createExtensionAPI,
  getPluginExtensionRegistrationCount,
} from '@/lib/plugin/api/extension-api';

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
  createGuardedAPI: jest.fn((_pluginId, api) => api),
}));

import { usePluginStore } from '@/stores/plugin';

function loadFixtureManifest(relativePath: string): PluginManifest {
  const fixturePath = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'plugin-sdk',
    'examples',
    relativePath,
    'plugin.json'
  );
  return JSON.parse(fs.readFileSync(fixturePath, 'utf-8')) as PluginManifest;
}

function createStore() {
  const frontendFixture = loadFixtureManifest('basic-tool');
  const pythonFixture = loadFixtureManifest('python-plugin');
  const plugins: Record<string, Plugin> = {
    'ts-conformance': {
      manifest: frontendFixture,
      status: 'installed',
      source: 'local',
      path: '/plugins/ts-conformance',
      config: {},
    },
    'py-conformance': {
      manifest: pythonFixture,
      status: 'installed',
      source: 'local',
      path: '/plugins/py-conformance',
      config: {},
    },
  };

  return {
    plugins,
    loadPlugin: jest.fn(async (pluginId: string) => {
      const plugin = plugins[pluginId];
      plugins[pluginId] = { ...plugin, status: 'loaded' };
    }),
    enablePlugin: jest.fn(async (pluginId: string) => {
      const plugin = plugins[pluginId];
      plugins[pluginId] = { ...plugin, status: 'enabled' };
    }),
    disablePlugin: jest.fn(async (pluginId: string) => {
      const plugin = plugins[pluginId];
      plugins[pluginId] = { ...plugin, status: 'disabled' };
    }),
    setPluginError: jest.fn(),
    setPluginStatus: jest.fn((pluginId: string, status: Plugin['status']) => {
      const plugin = plugins[pluginId];
      plugins[pluginId] = { ...plugin, status };
    }),
    setPluginConfig: jest.fn(),
    registerPluginHooks: jest.fn(),
    registerPluginTool: jest.fn((pluginId: string, tool: NonNullable<Plugin['tools']>[number]) => {
      const plugin = plugins[pluginId];
      const currentTools = plugin.tools || [];
      plugins[pluginId] = {
        ...plugin,
        tools: [...currentTools, tool],
      };
    }),
    unregisterPluginTool: jest.fn(),
    unregisterPluginMode: jest.fn(),
    unregisterPluginCommand: jest.fn(),
    unregisterPluginComponent: jest.fn(),
  };
}

describe('Plugin lifecycle conformance', () => {
  const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;
  const mockGetState = usePluginStore.getState as unknown as jest.Mock;

  beforeEach(() => {
    mockInvoke.mockReset();
    const store = createStore();
    mockGetState.mockReturnValue(store);

    mockInvoke.mockImplementation(async (command: string, payload?: unknown) => {
      if (command === 'plugin_python_runtime_info') {
        return {
          available: true,
          version: '3.11.0',
          plugin_count: 0,
          total_calls: 0,
          total_execution_time_ms: 0,
          failed_calls: 0,
        };
      }
      if (command === 'plugin_python_load') return null;
      if (command === 'plugin_python_get_tools') {
        return [
          {
            name: 'sum',
            description: 'Sum numbers',
            parameters: {
              type: 'object',
              properties: {
                a: { type: 'number' },
                b: { type: 'number' },
              },
            },
          },
        ];
      }
      if (command === 'plugin_python_call_tool') {
        const args = payload as { args: { a: number; b: number } };
        return { total: args.args.a + args.args.b };
      }
      if (command === 'plugin_python_unload') return null;
      if (command === 'plugin_set_state') return null;
      if (command === 'plugin_permission_list') return [];
      if (command === 'plugin_permission_revoke') return null;
      return null;
    });

    (getPluginSignatureVerifier as jest.Mock).mockReturnValue({
      getConfig: () => ({
        requireSignatures: false,
        allowUntrusted: true,
      }),
      verify: jest.fn().mockResolvedValue({ valid: true }),
    });

    (getPermissionGuard as jest.Mock).mockReturnValue({
      registerPlugin: jest.fn(),
      unregisterPlugin: jest.fn(),
      revokeAll: jest.fn(),
    });

    clearPluginExtensions('ts-conformance');
    clearPluginExtensions('py-conformance');
  });

  it('runs frontend and python plugin lifecycle with tool execution', async () => {
    const manager = new PluginManager({
      pluginDirectory: '/plugins',
      compatibilityMode: 'warn',
      hostVersion: '0.1.0',
      enablePython: true,
    });

    const loader = (manager as unknown as {
      loader: { load: jest.Mock };
    }).loader;

    loader.load = jest.fn(async (plugin: Plugin) => ({
      manifest: plugin.manifest,
      activate: async () => ({}),
      deactivate: async () => undefined,
    }));

    await manager.enablePlugin('ts-conformance');
    await manager.enablePlugin('py-conformance');

    const extensionApi = createExtensionAPI('ts-conformance');
    extensionApi.registerExtension('chat.header', () => null);
    expect(getPluginExtensionRegistrationCount('ts-conformance')).toBe(1);

    const tool = manager.getRegistry().getTool('py-conformance:sum');
    expect(tool).toBeDefined();
    const execution = await tool!.execute(
      { a: 2, b: 3 },
      { config: {} }
    );
    expect(execution).toEqual({ total: 5 });

    await manager.disablePlugin('ts-conformance');
    await manager.disablePlugin('py-conformance');

    expect(getPluginExtensionRegistrationCount('ts-conformance')).toBe(0);
    expect(getPluginExtensionRegistrationCount('py-conformance')).toBe(0);

    const store = mockGetState.mock.results[0].value as ReturnType<typeof createStore>;
    expect(store.plugins['ts-conformance'].status).toBe('disabled');
    expect(store.plugins['py-conformance'].status).toBe('disabled');
  });
});
