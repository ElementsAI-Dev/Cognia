/**
 * Plugin System Tests
 */

import {
  registerPlugin,
  unregisterPlugin,
  enablePlugin,
  disablePlugin,
  getPlugin,
  getAllPlugins,
  getEnabledPlugins,
  executeHook,
  executePluginAction,
  getPluginSettings,
  updatePluginSettings,
  resetPluginRegistry,
  type DesignerPlugin,
  type PluginContext,
} from './plugin-system';

const mockContext: PluginContext = {
  code: 'export default function App() { return <div>Test</div>; }',
  elementTree: null,
  selectedElementId: null,
  getElement: () => null,
  updateCode: jest.fn(),
  showNotification: jest.fn(),
};

const createMockPlugin = (id: string, enabled = false): DesignerPlugin => ({
  id,
  name: `Test Plugin ${id}`,
  version: '1.0.0',
  description: `Test plugin ${id}`,
  category: 'analysis',
  enabled,
  hooks: {
    afterEdit: async () => ({ success: true, data: 'hook executed' }),
  },
  actions: [
    {
      id: 'test-action',
      label: 'Test Action',
      execute: async () => ({ success: true, data: 'action executed' }),
    },
  ],
  settings: [
    {
      id: 'testSetting',
      label: 'Test Setting',
      type: 'boolean',
      default: true,
    },
  ],
});

describe('Plugin System', () => {
  beforeEach(() => {
    resetPluginRegistry();
    localStorage.clear();
  });

  afterEach(() => {
    resetPluginRegistry();
    localStorage.clear();
  });

  describe('registerPlugin', () => {
    it('should register a plugin', () => {
      const plugin = createMockPlugin('test-1');
      registerPlugin(plugin);

      const retrieved = getPlugin('test-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Plugin test-1');
    });

    it('should initialize default settings', () => {
      const plugin = createMockPlugin('test-2');
      registerPlugin(plugin);

      const settings = getPluginSettings('test-2');
      expect(settings.testSetting).toBe(true);
    });
  });

  describe('unregisterPlugin', () => {
    it('should unregister a plugin', () => {
      const plugin = createMockPlugin('test-3');
      registerPlugin(plugin);

      const result = unregisterPlugin('test-3');
      expect(result).toBe(true);

      const retrieved = getPlugin('test-3');
      expect(retrieved).toBeUndefined();
    });

    it('should return false for non-existent plugin', () => {
      const result = unregisterPlugin('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('enablePlugin / disablePlugin', () => {
    it('should enable a plugin', async () => {
      const plugin = createMockPlugin('test-4');
      registerPlugin(plugin);

      await enablePlugin('test-4', mockContext);

      const retrieved = getPlugin('test-4');
      expect(retrieved?.enabled).toBe(true);
    });

    it('should disable a plugin', async () => {
      const plugin = createMockPlugin('test-5', true);
      registerPlugin(plugin);

      await disablePlugin('test-5');

      const retrieved = getPlugin('test-5');
      expect(retrieved?.enabled).toBe(false);
    });
  });

  describe('getAllPlugins / getEnabledPlugins', () => {
    it('should return all plugins', () => {
      registerPlugin(createMockPlugin('p1'));
      registerPlugin(createMockPlugin('p2'));
      registerPlugin(createMockPlugin('p3'));

      const all = getAllPlugins();
      expect(all).toHaveLength(3);
    });

    it('should return only enabled plugins', async () => {
      registerPlugin(createMockPlugin('p1'));
      registerPlugin(createMockPlugin('p2'));
      registerPlugin(createMockPlugin('p3'));

      await enablePlugin('p1', mockContext);
      await enablePlugin('p3', mockContext);

      const enabled = getEnabledPlugins();
      expect(enabled).toHaveLength(2);
    });
  });

  describe('executeHook', () => {
    it('should execute hooks on enabled plugins', async () => {
      const plugin = createMockPlugin('hook-test', true);
      registerPlugin(plugin);

      const results = await executeHook('afterEdit', mockContext);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('should not execute hooks on disabled plugins', async () => {
      const plugin = createMockPlugin('hook-test-2', false);
      registerPlugin(plugin);

      const results = await executeHook('afterEdit', mockContext);

      expect(results).toHaveLength(0);
    });
  });

  describe('executePluginAction', () => {
    it('should execute plugin action', async () => {
      const plugin = createMockPlugin('action-test', true);
      registerPlugin(plugin);

      const result = await executePluginAction('action-test', 'test-action', mockContext);

      expect(result.success).toBe(true);
    });

    it('should fail for disabled plugin', async () => {
      const plugin = createMockPlugin('action-test-2', false);
      registerPlugin(plugin);

      const result = await executePluginAction('action-test-2', 'test-action', mockContext);

      expect(result.success).toBe(false);
    });

    it('should fail for non-existent action', async () => {
      const plugin = createMockPlugin('action-test-3', true);
      registerPlugin(plugin);

      const result = await executePluginAction('action-test-3', 'non-existent', mockContext);

      expect(result.success).toBe(false);
    });
  });

  describe('Plugin Settings', () => {
    it('should update plugin settings', () => {
      const plugin = createMockPlugin('settings-test');
      registerPlugin(plugin);

      updatePluginSettings('settings-test', { testSetting: false, newSetting: 'value' });

      const settings = getPluginSettings('settings-test');
      expect(settings.testSetting).toBe(false);
      expect(settings.newSetting).toBe('value');
    });
  });
});
