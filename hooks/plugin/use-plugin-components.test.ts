/**
 * Tests for usePluginComponents hook
 * Comprehensive test coverage for plugin component access
 */

import { renderHook } from '@testing-library/react';
import {
  usePluginComponents,
  usePluginComponentsFromPlugin,
  usePluginComponent,
} from './use-plugin-components';
import * as pluginStore from '@/stores/plugin';
import type { PluginA2UIComponent } from '@/types/plugin';

// Mock the plugin store
jest.mock('@/stores/plugin', () => ({
  usePluginStore: jest.fn(),
}));

const mockUsePluginStore = pluginStore.usePluginStore as unknown as jest.Mock;

// Mock component data
const mockComponent = jest.fn(() => null);
const mockComponents: PluginA2UIComponent[] = [
  {
    type: 'custom-chart',
    pluginId: 'plugin-a',
    component: mockComponent,
    metadata: {
      type: 'custom-chart',
      name: 'Custom Chart',
      category: 'display',
      description: 'A custom chart component',
    },
  },
  {
    type: 'data-table',
    pluginId: 'plugin-a',
    component: mockComponent,
    metadata: {
      type: 'data-table',
      name: 'Data Table',
      category: 'data',
      description: 'A data table component',
    },
  },
  {
    type: 'custom-input',
    pluginId: 'plugin-b',
    component: mockComponent,
    metadata: {
      type: 'custom-input',
      name: 'Custom Input',
      category: 'form',
      description: 'A custom input component',
    },
  },
];

const mockPlugins = {
  'plugin-a': {
    id: 'plugin-a',
    name: 'Plugin A',
    status: 'enabled',
    components: mockComponents.filter((c) => c.pluginId === 'plugin-a'),
  },
  'plugin-b': {
    id: 'plugin-b',
    name: 'Plugin B',
    status: 'enabled',
    components: mockComponents.filter((c) => c.pluginId === 'plugin-b'),
  },
  'plugin-c': {
    id: 'plugin-c',
    name: 'Plugin C',
    status: 'disabled',
    components: [],
  },
};

describe('usePluginComponents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePluginStore.mockReturnValue({
      getAllComponents: jest.fn(() => mockComponents),
      plugins: mockPlugins,
    });
  });

  describe('Initial State', () => {
    it('should return all components', () => {
      const { result } = renderHook(() => usePluginComponents());

      expect(result.current.components).toHaveLength(3);
      expect(result.current.components).toEqual(mockComponents);
    });

    it('should return required methods', () => {
      const { result } = renderHook(() => usePluginComponents());

      expect(typeof result.current.getComponentByType).toBe('function');
      expect(typeof result.current.getComponentsByPlugin).toBe('function');
      expect(typeof result.current.getComponentsByCategory).toBe('function');
    });
  });

  describe('getComponentByType', () => {
    it('should find component by type', () => {
      const { result } = renderHook(() => usePluginComponents());

      const component = result.current.getComponentByType('custom-chart');

      expect(component).toBeDefined();
      expect(component?.type).toBe('custom-chart');
      expect(component?.pluginId).toBe('plugin-a');
    });

    it('should return undefined for unknown type', () => {
      const { result } = renderHook(() => usePluginComponents());

      const component = result.current.getComponentByType('unknown-type');

      expect(component).toBeUndefined();
    });
  });

  describe('getComponentsByPlugin', () => {
    it('should return components for specific plugin', () => {
      const { result } = renderHook(() => usePluginComponents());

      const components = result.current.getComponentsByPlugin('plugin-a');

      expect(components).toHaveLength(2);
      expect(components.every((c) => c.pluginId === 'plugin-a')).toBe(true);
    });

    it('should return empty array for plugin with no components', () => {
      const { result } = renderHook(() => usePluginComponents());

      const components = result.current.getComponentsByPlugin('plugin-c');

      expect(components).toEqual([]);
    });

    it('should return empty array for unknown plugin', () => {
      const { result } = renderHook(() => usePluginComponents());

      const components = result.current.getComponentsByPlugin('unknown-plugin');

      expect(components).toEqual([]);
    });
  });

  describe('getComponentsByCategory', () => {
    it('should return components by category', () => {
      const { result } = renderHook(() => usePluginComponents());

      const components = result.current.getComponentsByCategory('display');

      expect(components).toHaveLength(1);
      expect(components[0].type).toBe('custom-chart');
    });

    it('should return empty array for unknown category', () => {
      const { result } = renderHook(() => usePluginComponents());

      const components = result.current.getComponentsByCategory('unknown-category');

      expect(components).toEqual([]);
    });
  });

  describe('Memoization', () => {
    it('should memoize components array', () => {
      const { result, rerender } = renderHook(() => usePluginComponents());

      const firstComponents = result.current.components;
      rerender();
      const secondComponents = result.current.components;

      expect(firstComponents).toBe(secondComponents);
    });

    it('should memoize return object', () => {
      const { result, rerender } = renderHook(() => usePluginComponents());

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      expect(firstResult).toBe(secondResult);
    });
  });
});

describe('usePluginComponentsFromPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePluginStore.mockReturnValue({
      plugins: mockPlugins,
    });
  });

  it('should return components for specific plugin', () => {
    const { result } = renderHook(() => usePluginComponentsFromPlugin('plugin-a'));

    expect(result.current.components).toHaveLength(2);
    expect(result.current.isEnabled).toBe(true);
    expect(result.current.count).toBe(2);
  });

  it('should return empty components for plugin with none', () => {
    const { result } = renderHook(() => usePluginComponentsFromPlugin('plugin-c'));

    expect(result.current.components).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it('should return isEnabled false for disabled plugin', () => {
    const { result } = renderHook(() => usePluginComponentsFromPlugin('plugin-c'));

    expect(result.current.isEnabled).toBe(false);
  });

  it('should handle unknown plugin', () => {
    const { result } = renderHook(() => usePluginComponentsFromPlugin('unknown'));

    expect(result.current.components).toEqual([]);
    expect(result.current.isEnabled).toBe(false);
    expect(result.current.count).toBe(0);
  });
});

describe('usePluginComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePluginStore.mockReturnValue({
      getAllComponents: jest.fn(() => mockComponents),
      plugins: mockPlugins,
    });
  });

  it('should return component by type', () => {
    const { result } = renderHook(() => usePluginComponent('custom-chart'));

    expect(result.current.component).toBe(mockComponent);
    expect(result.current.pluginId).toBe('plugin-a');
    expect(result.current.isAvailable).toBe(true);
  });

  it('should return metadata for component', () => {
    const { result } = renderHook(() => usePluginComponent('custom-chart'));

    expect(result.current.metadata).toBeDefined();
    expect(result.current.metadata?.category).toBe('display');
  });

  it('should return null for unknown type', () => {
    const { result } = renderHook(() => usePluginComponent('unknown-type'));

    expect(result.current.component).toBeNull();
    expect(result.current.metadata).toBeNull();
    expect(result.current.pluginId).toBeNull();
    expect(result.current.isAvailable).toBe(false);
  });

  it('should return null if plugin is disabled', () => {
    mockUsePluginStore.mockReturnValue({
      getAllComponents: jest.fn(() => [
        {
          type: 'disabled-component',
          pluginId: 'plugin-c',
          component: mockComponent,
          metadata: { category: 'test', description: 'Test' },
        },
      ]),
      plugins: mockPlugins,
    });

    const { result } = renderHook(() => usePluginComponent('disabled-component'));

    expect(result.current.component).toBeNull();
    expect(result.current.isAvailable).toBe(false);
  });

  it('should memoize component lookup', () => {
    const { result, rerender } = renderHook(() => usePluginComponent('custom-chart'));

    const firstComponent = result.current.component;
    rerender();
    const secondComponent = result.current.component;

    expect(firstComponent).toBe(secondComponent);
  });
});
