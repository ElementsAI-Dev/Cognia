/**
 * @jest-environment jsdom
 */

/**
 * Tests for useAgentMode hook
 */

import { renderHook } from '@testing-library/react';
import { useAgentMode } from './use-agent-mode';
import { useCustomModeStore } from '@/stores/agent/custom-mode-store';
import { usePluginStore } from '@/stores/plugin/plugin-store';

// Mock stores
jest.mock('@/stores/agent/custom-mode-store', () => ({
  useCustomModeStore: jest.fn(),
}));

jest.mock('@/stores/plugin/plugin-store', () => ({
  usePluginStore: jest.fn(),
}));

jest.mock('@/types/agent/agent-mode', () => ({
  BUILT_IN_AGENT_MODES: [
    { id: 'general', name: 'General', type: 'general', description: 'General assistant', icon: 'Bot' },
    { id: 'code-gen', name: 'Code Gen', type: 'code-gen', description: 'Code generation', icon: 'Code2' },
  ],
}));

describe('useAgentMode', () => {
  const mockCustomModes = {
    'custom-1': {
      id: 'custom-1',
      type: 'custom',
      name: 'Custom Mode 1',
      description: 'Test custom mode',
      icon: 'Star',
      isBuiltIn: false,
      tools: ['calculator'],
      systemPrompt: 'You are a custom assistant',
      outputFormat: 'text',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    'custom-2': {
      id: 'custom-2',
      type: 'custom',
      name: 'Custom Mode 2',
      description: 'Another custom mode',
      icon: 'Heart',
      isBuiltIn: false,
      tools: ['web_search'],
      systemPrompt: 'You are another assistant',
      outputFormat: 'markdown',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const mockPluginModes = [
    { id: 'plugin-1', name: 'Plugin Mode', type: 'plugin', description: 'From plugin', icon: 'Puzzle' },
  ];

  const mockCreateMode = jest.fn();
  const mockUpdateMode = jest.fn();
  const mockDeleteMode = jest.fn();
  const mockDuplicateMode = jest.fn();
  const mockRecordModeUsage = jest.fn();
  const mockGetAllModes = jest.fn(() => mockPluginModes);

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useCustomModeStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        customModes: mockCustomModes,
        createMode: mockCreateMode,
        updateMode: mockUpdateMode,
        deleteMode: mockDeleteMode,
        duplicateMode: mockDuplicateMode,
        recordModeUsage: mockRecordModeUsage,
      };
      return selector ? selector(state) : state;
    });

    (usePluginStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        getAllModes: mockGetAllModes,
      };
      return selector ? selector(state) : state;
    });
  });

  describe('mode retrieval', () => {
    it('should return all modes combined', () => {
      const { result } = renderHook(() => useAgentMode());

      expect(result.current.allModes).toHaveLength(5); // 2 built-in + 2 custom + 1 plugin
    });

    it('should return built-in modes', () => {
      const { result } = renderHook(() => useAgentMode());

      expect(result.current.builtInModes).toHaveLength(2);
      expect(result.current.builtInModes[0].id).toBe('general');
    });

    it('should return custom modes', () => {
      const { result } = renderHook(() => useAgentMode());

      expect(result.current.customModes).toHaveLength(2);
      expect(result.current.customModes[0].id).toBe('custom-1');
    });

    it('should return plugin modes', () => {
      const { result } = renderHook(() => useAgentMode());

      expect(result.current.pluginModes).toHaveLength(1);
      expect(result.current.pluginModes[0].id).toBe('plugin-1');
    });

    it('should respect includeBuiltIn option', () => {
      const { result } = renderHook(() => useAgentMode({ includeBuiltIn: false }));

      expect(result.current.builtInModes).toHaveLength(0);
      expect(result.current.allModes).toHaveLength(3); // Only custom + plugin
    });

    it('should respect includeCustom option', () => {
      const { result } = renderHook(() => useAgentMode({ includeCustom: false }));

      // customModes still returns all custom modes (for management purposes)
      // but allModes excludes them
      expect(result.current.allModes).toHaveLength(3); // Only built-in + plugin
    });

    it('should respect includePlugin option', () => {
      const { result } = renderHook(() => useAgentMode({ includePlugin: false }));

      expect(result.current.pluginModes).toHaveLength(0);
      expect(result.current.allModes).toHaveLength(4); // Only built-in + custom
    });
  });

  describe('getModeById', () => {
    it('should get built-in mode by ID', () => {
      const { result } = renderHook(() => useAgentMode());

      const mode = result.current.getModeById('general');
      expect(mode).toBeDefined();
      expect(mode?.name).toBe('General');
    });

    it('should get custom mode by ID', () => {
      const { result } = renderHook(() => useAgentMode());

      const mode = result.current.getModeById('custom-1');
      expect(mode).toBeDefined();
      expect(mode?.name).toBe('Custom Mode 1');
    });

    it('should get plugin mode by ID', () => {
      const { result } = renderHook(() => useAgentMode());

      const mode = result.current.getModeById('plugin-1');
      expect(mode).toBeDefined();
      expect(mode?.name).toBe('Plugin Mode');
    });

    it('should return undefined for non-existent ID', () => {
      const { result } = renderHook(() => useAgentMode());

      const mode = result.current.getModeById('non-existent');
      expect(mode).toBeUndefined();
    });
  });

  describe('getModesByType', () => {
    it('should get built-in modes', () => {
      const { result } = renderHook(() => useAgentMode());

      const modes = result.current.getModesByType('built-in');
      expect(modes).toHaveLength(2);
    });

    it('should get custom modes', () => {
      const { result } = renderHook(() => useAgentMode());

      const modes = result.current.getModesByType('custom');
      expect(modes).toHaveLength(2);
    });

    it('should get plugin modes', () => {
      const { result } = renderHook(() => useAgentMode());

      const modes = result.current.getModesByType('plugin');
      expect(modes).toHaveLength(1);
    });
  });

  describe('mode type checks', () => {
    it('should identify built-in mode', () => {
      const { result } = renderHook(() => useAgentMode());

      expect(result.current.isBuiltInMode('general')).toBe(true);
      expect(result.current.isBuiltInMode('custom-1')).toBe(false);
    });

    it('should identify custom mode', () => {
      const { result } = renderHook(() => useAgentMode());

      expect(result.current.isCustomMode('custom-1')).toBe(true);
      expect(result.current.isCustomMode('general')).toBe(false);
    });

    it('should identify plugin mode', () => {
      const { result } = renderHook(() => useAgentMode());

      expect(result.current.isPluginMode('plugin-1')).toBe(true);
      expect(result.current.isPluginMode('general')).toBe(false);
    });
  });

  describe('CRUD operations', () => {
    it('should call createCustomMode', () => {
      const { result } = renderHook(() => useAgentMode());

      result.current.createCustomMode({ name: 'New Mode' });
      expect(mockCreateMode).toHaveBeenCalledWith({ name: 'New Mode' });
    });

    it('should call updateCustomMode', () => {
      const { result } = renderHook(() => useAgentMode());

      result.current.updateCustomMode('custom-1', { name: 'Updated' });
      expect(mockUpdateMode).toHaveBeenCalledWith('custom-1', { name: 'Updated' });
    });

    it('should call deleteCustomMode', () => {
      const { result } = renderHook(() => useAgentMode());

      result.current.deleteCustomMode('custom-1');
      expect(mockDeleteMode).toHaveBeenCalledWith('custom-1');
    });

    it('should call duplicateCustomMode', () => {
      const { result } = renderHook(() => useAgentMode());

      result.current.duplicateCustomMode('custom-1');
      expect(mockDuplicateMode).toHaveBeenCalledWith('custom-1');
    });
  });

  describe('usage tracking', () => {
    it('should record usage for custom modes', () => {
      const { result } = renderHook(() => useAgentMode());

      result.current.recordUsage('custom-1');
      expect(mockRecordModeUsage).toHaveBeenCalledWith('custom-1');
    });

    it('should not record usage for non-custom modes', () => {
      const { result } = renderHook(() => useAgentMode());

      result.current.recordUsage('general');
      expect(mockRecordModeUsage).not.toHaveBeenCalled();
    });
  });

  describe('configuration helpers', () => {
    it('should get mode system prompt', () => {
      const { result } = renderHook(() => useAgentMode());

      const prompt = result.current.getModeSystemPrompt('custom-1');
      expect(prompt).toBe('You are a custom assistant');
    });

    it('should return empty string for mode without prompt', () => {
      const { result } = renderHook(() => useAgentMode());

      const prompt = result.current.getModeSystemPrompt('general');
      expect(prompt).toBe('');
    });

    it('should get mode tools', () => {
      const { result } = renderHook(() => useAgentMode());

      const tools = result.current.getModeTools('custom-1');
      expect(tools).toEqual(['calculator']);
    });

    it('should return empty array for mode without tools', () => {
      const { result } = renderHook(() => useAgentMode());

      const tools = result.current.getModeTools('general');
      expect(tools).toEqual([]);
    });

    it('should get mode output format', () => {
      const { result } = renderHook(() => useAgentMode());

      const format = result.current.getModeOutputFormat('custom-2');
      expect(format).toBe('markdown');
    });

    it('should return text as default output format', () => {
      const { result } = renderHook(() => useAgentMode());

      const format = result.current.getModeOutputFormat('general');
      expect(format).toBe('text');
    });
  });
});
