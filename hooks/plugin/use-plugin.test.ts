/**
 * Plugin Hooks Tests
 */

import { renderHook } from '@testing-library/react';
import { usePlugin, usePlugins, usePluginEvents } from './use-plugin';
import { usePluginStore } from '@/stores/plugin';
import type { Plugin, PluginManifest } from '@/types/plugin';

// Mock the plugin store
jest.mock('@/stores/plugin', () => {
  const actualStore = jest.requireActual('zustand');
  const store = actualStore.create(() => ({
    plugins: {},
    loading: new Set<string>(),
    initialized: false,
    errors: {},
    eventListeners: new Map(),
    enablePlugin: jest.fn(),
    disablePlugin: jest.fn(),
    setPluginConfig: jest.fn(),
    addEventListener: jest.fn(() => () => {}),
  }));

  return {
    usePluginStore: Object.assign(store, {
      getState: store.getState,
      setState: store.setState,
    }),
  };
});

const mockManifest: PluginManifest = {
  id: 'test-plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  description: 'A test plugin',
  type: 'frontend',
  capabilities: ['tools'],
  author: { name: 'Test' },
  main: 'index.ts',
};

const mockPlugin: Plugin = {
  manifest: mockManifest,
  status: 'enabled',
  source: 'local',
  path: '/plugins/test-plugin',
  config: {},
};

describe('usePlugin', () => {
  beforeEach(() => {
    usePluginStore.setState({
      plugins: {
        'test-plugin': mockPlugin,
      },
      getPlugin: (id: string) => {
        const state = usePluginStore.getState();
        return state.plugins[id];
      },
    });
  });

  it('should return plugin by ID', () => {
    const { result } = renderHook(() => usePlugin('test-plugin'));

    expect(result.current.plugin).toBeDefined();
    expect(result.current.plugin?.manifest.id).toBe('test-plugin');
  });

  it('should return undefined for unknown plugin', () => {
    const { result } = renderHook(() => usePlugin('unknown'));

    expect(result.current.plugin).toBeUndefined();
  });

  it('should return loading state', () => {
    const loadingSet = new Set(['test-plugin']);
    usePluginStore.setState({ loading: loadingSet });
    const { result } = renderHook(() => usePlugin('test-plugin'));

    expect(result.current.isLoading).toBe(true);
  });

  it('should return error state', () => {
    usePluginStore.setState({
      errors: { 'test-plugin': 'Test error' },
    });
    const { result } = renderHook(() => usePlugin('test-plugin'));

    expect(result.current.error).toBe('Test error');
  });

  it('should return isEnabled correctly', () => {
    const { result } = renderHook(() => usePlugin('test-plugin'));

    expect(result.current.isEnabled).toBe(true);
  });

  it('should return isEnabled false for disabled plugins', () => {
    usePluginStore.setState({
      plugins: {
        'disabled-plugin': { ...mockPlugin, status: 'disabled', manifest: { ...mockManifest, id: 'disabled-plugin' } },
      },
    });

    const { result } = renderHook(() => usePlugin('disabled-plugin'));

    expect(result.current.isEnabled).toBe(false);
  });
});

describe('usePlugins', () => {
  beforeEach(() => {
    usePluginStore.setState({
      plugins: {
        'plugin-a': { ...mockPlugin, manifest: { ...mockManifest, id: 'plugin-a' } },
        'plugin-b': { ...mockPlugin, status: 'disabled', manifest: { ...mockManifest, id: 'plugin-b' } },
        'plugin-c': { ...mockPlugin, status: 'error', manifest: { ...mockManifest, id: 'plugin-c' } },
      },
      initialized: true,
      loading: new Set<string>(),
    });
  });

  it('should return all plugins', () => {
    const { result } = renderHook(() => usePlugins());

    expect(result.current.plugins).toHaveLength(3);
  });

  it('should return enabled plugins', () => {
    const { result } = renderHook(() => usePlugins());

    expect(result.current.enabledPlugins).toHaveLength(1);
    expect(result.current.enabledPlugins[0].manifest.id).toBe('plugin-a');
  });

  it('should return disabled plugins', () => {
    const { result } = renderHook(() => usePlugins());

    expect(result.current.disabledPlugins).toHaveLength(1);
    expect(result.current.disabledPlugins[0].manifest.id).toBe('plugin-b');
  });

  it('should return error plugins', () => {
    const { result } = renderHook(() => usePlugins());

    expect(result.current.errorPlugins).toHaveLength(1);
    expect(result.current.errorPlugins[0].manifest.id).toBe('plugin-c');
  });

  it('should return initialized state', () => {
    const { result } = renderHook(() => usePlugins());

    expect(result.current.initialized).toBe(true);
  });
});

describe('usePluginEvents', () => {
  const mockAddEventListener = jest.fn(() => () => {});

  beforeEach(() => {
    usePluginStore.setState({
      addEventListener: mockAddEventListener,
    });
    jest.clearAllMocks();
  });

  it('should subscribe to events on mount', () => {
    const handler = jest.fn();
    renderHook(() => usePluginEvents('plugin:enabled', handler));

    expect(mockAddEventListener).toHaveBeenCalledWith('plugin:enabled', handler);
  });

  it('should return unsubscribe function from addEventListener', () => {
    const handler = jest.fn();
    const unsubscribe = jest.fn();
    mockAddEventListener.mockReturnValue(unsubscribe);

    renderHook(() => usePluginEvents('plugin:enabled', handler));

    // The hook should have received an unsubscribe function
    expect(mockAddEventListener).toHaveReturnedWith(unsubscribe);
  });

  it('should handle different event types', () => {
    const handler = jest.fn();
    renderHook(() => usePluginEvents('plugin:enabled', handler));
    renderHook(() => usePluginEvents('plugin:disabled', handler));

    expect(mockAddEventListener).toHaveBeenCalledTimes(2);
  });
});
