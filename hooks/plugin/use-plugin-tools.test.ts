/**
 * Tests for usePluginTools hook
 * Comprehensive test coverage for plugin tools access and execution
 */

import { renderHook, act } from '@testing-library/react';
import { usePluginTools, usePluginToolsFromPlugin } from './use-plugin-tools';
import * as pluginStore from '@/stores/plugin';
import type { PluginTool } from '@/types/plugin';

// Mock the plugin store
jest.mock('@/stores/plugin', () => ({
  usePluginStore: jest.fn(),
}));

const mockUsePluginStore = pluginStore.usePluginStore as unknown as jest.Mock;

// Mock tool execute functions
const mockExecute1 = jest.fn().mockResolvedValue({ result: 'tool-1-result' });
const mockExecute2 = jest.fn().mockResolvedValue({ result: 'tool-2-result' });
const mockExecute3 = jest.fn().mockResolvedValue({ result: 'tool-3-result' });

// Mock tool data - cast to unknown first then to PluginTool[] to bypass strict type checking
const mockTools = [
  {
    name: 'search-tool',
    pluginId: 'plugin-a',
    execute: mockExecute1,
  },
  {
    name: 'analyze-tool',
    pluginId: 'plugin-a',
    execute: mockExecute2,
  },
  {
    name: 'generate-tool',
    pluginId: 'plugin-b',
    execute: mockExecute3,
  },
] as unknown as PluginTool[];

const mockPlugins = {
  'plugin-a': {
    id: 'plugin-a',
    name: 'Plugin A',
    status: 'enabled',
    config: { apiKey: 'test-key' },
    tools: mockTools.filter((t) => t.pluginId === 'plugin-a'),
  },
  'plugin-b': {
    id: 'plugin-b',
    name: 'Plugin B',
    status: 'enabled',
    config: {},
    tools: mockTools.filter((t) => t.pluginId === 'plugin-b'),
  },
  'plugin-c': {
    id: 'plugin-c',
    name: 'Plugin C',
    status: 'disabled',
    config: {},
    tools: [],
  },
};

describe('usePluginTools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePluginStore.mockReturnValue({
      getAllTools: jest.fn(() => mockTools),
      plugins: mockPlugins,
    });
  });

  describe('Initial State', () => {
    it('should return all tools', () => {
      const { result } = renderHook(() => usePluginTools());

      expect(result.current.tools).toHaveLength(3);
      expect(result.current.tools).toEqual(mockTools);
    });

    it('should return required methods', () => {
      const { result } = renderHook(() => usePluginTools());

      expect(typeof result.current.getToolByName).toBe('function');
      expect(typeof result.current.getToolsByPlugin).toBe('function');
      expect(typeof result.current.executeTool).toBe('function');
    });
  });

  describe('getToolByName', () => {
    it('should find tool by name', () => {
      const { result } = renderHook(() => usePluginTools());

      const tool = result.current.getToolByName('search-tool');

      expect(tool).toBeDefined();
      expect(tool?.name).toBe('search-tool');
      expect(tool?.pluginId).toBe('plugin-a');
    });

    it('should return undefined for unknown tool', () => {
      const { result } = renderHook(() => usePluginTools());

      const tool = result.current.getToolByName('unknown-tool');

      expect(tool).toBeUndefined();
    });
  });

  describe('getToolsByPlugin', () => {
    it('should return tools for specific plugin', () => {
      const { result } = renderHook(() => usePluginTools());

      const tools = result.current.getToolsByPlugin('plugin-a');

      expect(tools).toHaveLength(2);
      expect(tools.every((t) => t.pluginId === 'plugin-a')).toBe(true);
    });

    it('should return empty array for plugin with no tools', () => {
      const { result } = renderHook(() => usePluginTools());

      const tools = result.current.getToolsByPlugin('plugin-c');

      expect(tools).toEqual([]);
    });

    it('should return empty array for unknown plugin', () => {
      const { result } = renderHook(() => usePluginTools());

      const tools = result.current.getToolsByPlugin('unknown-plugin');

      expect(tools).toEqual([]);
    });
  });

  describe('executeTool', () => {
    it('should execute tool with arguments', async () => {
      const { result } = renderHook(() => usePluginTools());

      let response;
      await act(async () => {
        response = await result.current.executeTool('search-tool', { query: 'test' });
      });

      expect(mockExecute1).toHaveBeenCalledWith(
        { query: 'test' },
        { config: { apiKey: 'test-key' } }
      );
      expect(response).toEqual({ result: 'tool-1-result' });
    });

    it('should throw error for unknown tool', async () => {
      const { result } = renderHook(() => usePluginTools());

      await expect(
        act(async () => {
          await result.current.executeTool('unknown-tool', {});
        })
      ).rejects.toThrow('Tool not found: unknown-tool');
    });

    it('should throw error if plugin is disabled', async () => {
      mockUsePluginStore.mockReturnValue({
        getAllTools: jest.fn(() => [
          {
            name: 'disabled-tool',
            pluginId: 'plugin-c',
            description: 'A disabled tool',
            parameters: {},
            execute: jest.fn(),
          },
        ]),
        plugins: mockPlugins,
      });

      const { result } = renderHook(() => usePluginTools());

      await expect(
        act(async () => {
          await result.current.executeTool('disabled-tool', {});
        })
      ).rejects.toThrow('Plugin plugin-c is not enabled');
    });
  });

  describe('Memoization', () => {
    it('should memoize tools array', () => {
      const { result, rerender } = renderHook(() => usePluginTools());

      const firstTools = result.current.tools;
      rerender();
      const secondTools = result.current.tools;

      expect(firstTools).toBe(secondTools);
    });

    it('should memoize return object', () => {
      const { result, rerender } = renderHook(() => usePluginTools());

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      expect(firstResult).toBe(secondResult);
    });
  });
});

describe('usePluginToolsFromPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePluginStore.mockReturnValue({
      plugins: mockPlugins,
    });
  });

  it('should return tools for specific plugin', () => {
    const { result } = renderHook(() => usePluginToolsFromPlugin('plugin-a'));

    expect(result.current.tools).toHaveLength(2);
    expect(result.current.isEnabled).toBe(true);
  });

  it('should return single tool for plugin-b', () => {
    const { result } = renderHook(() => usePluginToolsFromPlugin('plugin-b'));

    expect(result.current.tools).toHaveLength(1);
    expect(result.current.tools[0].name).toBe('generate-tool');
  });

  it('should return empty tools for plugin with none', () => {
    const { result } = renderHook(() => usePluginToolsFromPlugin('plugin-c'));

    expect(result.current.tools).toEqual([]);
  });

  it('should return isEnabled false for disabled plugin', () => {
    const { result } = renderHook(() => usePluginToolsFromPlugin('plugin-c'));

    expect(result.current.isEnabled).toBe(false);
  });

  it('should handle unknown plugin', () => {
    const { result } = renderHook(() => usePluginToolsFromPlugin('unknown'));

    expect(result.current.tools).toEqual([]);
    expect(result.current.isEnabled).toBe(false);
  });

  describe('executeTool', () => {
    it('should execute tool from specific plugin', async () => {
      const { result } = renderHook(() => usePluginToolsFromPlugin('plugin-a'));

      await act(async () => {
        await result.current.executeTool('search-tool', { query: 'test' });
      });

      expect(mockExecute1).toHaveBeenCalled();
    });

    it('should throw if plugin is not enabled', async () => {
      const { result } = renderHook(() => usePluginToolsFromPlugin('plugin-c'));

      await expect(
        act(async () => {
          await result.current.executeTool('any-tool', {});
        })
      ).rejects.toThrow('Plugin plugin-c is not enabled');
    });

    it('should throw if tool not found', async () => {
      const { result } = renderHook(() => usePluginToolsFromPlugin('plugin-a'));

      await expect(
        act(async () => {
          await result.current.executeTool('nonexistent', {});
        })
      ).rejects.toThrow('Tool not found: nonexistent');
    });
  });
});
