/**
 * Tests for usePluginModes hook
 * Comprehensive test coverage for plugin-provided agent modes
 */

import { renderHook } from '@testing-library/react';
import { usePluginModes, usePluginModesFromPlugin } from './use-plugin-modes';
import * as pluginStore from '@/stores/plugin';
import type { AgentModeConfig } from '@/types/agent/agent-mode';

// Mock the plugin store
jest.mock('@/stores/plugin', () => ({
  usePluginStore: jest.fn(),
}));

const mockUsePluginStore = pluginStore.usePluginStore as unknown as jest.Mock;

// Mock mode data - cast to avoid strict type checking on mock data
const mockModes = [
  {
    id: 'research-mode',
    type: 'research',
    name: 'Research Mode',
    description: 'Deep research capabilities',
    icon: 'search',
    systemPrompt: 'You are a research assistant',
    tools: ['web-search', 'document-analysis'],
  },
  {
    id: 'coding-mode',
    type: 'coding',
    name: 'Coding Mode',
    description: 'Code generation and review',
    icon: 'code',
    systemPrompt: 'You are a coding assistant',
    tools: ['code-edit', 'lint'],
  },
  {
    id: 'creative-mode',
    type: 'creative',
    name: 'Creative Mode',
    description: 'Creative writing and ideation',
    icon: 'sparkles',
    systemPrompt: 'You are a creative assistant',
    tools: ['brainstorm'],
  },
] as AgentModeConfig[];

const mockPlugins = {
  'plugin-a': {
    id: 'plugin-a',
    name: 'Plugin A',
    status: 'enabled',
    modes: [mockModes[0], mockModes[1]],
  },
  'plugin-b': {
    id: 'plugin-b',
    name: 'Plugin B',
    status: 'enabled',
    modes: [mockModes[2]],
  },
  'plugin-c': {
    id: 'plugin-c',
    name: 'Plugin C',
    status: 'disabled',
    modes: [],
  },
};

describe('usePluginModes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePluginStore.mockReturnValue({
      getAllModes: jest.fn(() => mockModes),
      plugins: mockPlugins,
    });
  });

  describe('Initial State', () => {
    it('should return all modes', () => {
      const { result } = renderHook(() => usePluginModes());

      expect(result.current.modes).toHaveLength(3);
      expect(result.current.modes).toEqual(mockModes);
    });

    it('should return required methods', () => {
      const { result } = renderHook(() => usePluginModes());

      expect(typeof result.current.getModeById).toBe('function');
      expect(typeof result.current.getModesByPlugin).toBe('function');
    });
  });

  describe('getModeById', () => {
    it('should find mode by id', () => {
      const { result } = renderHook(() => usePluginModes());

      const mode = result.current.getModeById('research-mode');

      expect(mode).toBeDefined();
      expect(mode?.id).toBe('research-mode');
      expect(mode?.name).toBe('Research Mode');
    });

    it('should return undefined for unknown id', () => {
      const { result } = renderHook(() => usePluginModes());

      const mode = result.current.getModeById('unknown-mode');

      expect(mode).toBeUndefined();
    });
  });

  describe('getModesByPlugin', () => {
    it('should return modes for specific plugin', () => {
      const { result } = renderHook(() => usePluginModes());

      const modes = result.current.getModesByPlugin('plugin-a');

      expect(modes).toHaveLength(2);
      expect(modes.map((m) => m.id)).toContain('research-mode');
      expect(modes.map((m) => m.id)).toContain('coding-mode');
    });

    it('should return empty array for plugin with no modes', () => {
      const { result } = renderHook(() => usePluginModes());

      const modes = result.current.getModesByPlugin('plugin-c');

      expect(modes).toEqual([]);
    });

    it('should return empty array for unknown plugin', () => {
      const { result } = renderHook(() => usePluginModes());

      const modes = result.current.getModesByPlugin('unknown-plugin');

      expect(modes).toEqual([]);
    });
  });

  describe('Memoization', () => {
    it('should memoize modes array', () => {
      const { result, rerender } = renderHook(() => usePluginModes());

      const firstModes = result.current.modes;
      rerender();
      const secondModes = result.current.modes;

      expect(firstModes).toBe(secondModes);
    });

    it('should memoize return object', () => {
      const { result, rerender } = renderHook(() => usePluginModes());

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      expect(firstResult).toBe(secondResult);
    });
  });
});

describe('usePluginModesFromPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePluginStore.mockReturnValue({
      plugins: mockPlugins,
    });
  });

  it('should return modes for specific plugin', () => {
    const { result } = renderHook(() => usePluginModesFromPlugin('plugin-a'));

    expect(result.current.modes).toHaveLength(2);
    expect(result.current.isEnabled).toBe(true);
    expect(result.current.count).toBe(2);
  });

  it('should return single mode for plugin-b', () => {
    const { result } = renderHook(() => usePluginModesFromPlugin('plugin-b'));

    expect(result.current.modes).toHaveLength(1);
    expect(result.current.modes[0].id).toBe('creative-mode');
    expect(result.current.count).toBe(1);
  });

  it('should return empty modes for plugin with none', () => {
    const { result } = renderHook(() => usePluginModesFromPlugin('plugin-c'));

    expect(result.current.modes).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it('should return isEnabled false for disabled plugin', () => {
    const { result } = renderHook(() => usePluginModesFromPlugin('plugin-c'));

    expect(result.current.isEnabled).toBe(false);
  });

  it('should handle unknown plugin', () => {
    const { result } = renderHook(() => usePluginModesFromPlugin('unknown'));

    expect(result.current.modes).toEqual([]);
    expect(result.current.isEnabled).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it('should memoize modes array', () => {
    const { result, rerender } = renderHook(() => usePluginModesFromPlugin('plugin-a'));

    const firstModes = result.current.modes;
    rerender();
    const secondModes = result.current.modes;

    expect(firstModes).toBe(secondModes);
  });
});
