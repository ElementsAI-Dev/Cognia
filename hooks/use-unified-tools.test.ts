/**
 * Tests for useUnifiedTools hook
 */

import { renderHook } from '@testing-library/react';

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: () => ({
    ragEnabled: false,
  }),
  useSkillStore: () => ({
    skills: {},
    activeSkillIds: [],
  }),
  useMcpStore: () => ({
    servers: [],
    isInitialized: true,
  }),
  useVectorStore: () => ({
    collections: [],
  }),
}));

// Mock AI tools
jest.mock('@/lib/ai/tools', () => ({
  UnifiedToolRegistry: jest.fn().mockImplementation(() => ({
    getAll: () => [],
    filter: () => [],
    getBySource: () => [],
    getByCategory: () => [],
    getToolsRecord: () => ({}),
    search: () => [],
  })),
  getUnifiedToolRegistry: jest.fn(() => ({
    getAll: () => [],
    filter: () => [],
    getBySource: () => [],
    getByCategory: () => [],
    getToolsRecord: () => ({}),
    search: () => [],
  })),
  registerBuiltinTools: jest.fn(),
  registerSkillTools: jest.fn(),
  registerMcpTools: jest.fn(),
  registerCustomTools: jest.fn(),
}));

jest.mock('@/lib/ai/agent', () => ({
  initializeAgentTools: jest.fn(() => ({})),
  createMcpToolsFromStore: jest.fn(() => ({})),
  createMcpToolsFromBackend: jest.fn(() => ({})),
  createRAGSearchTool: jest.fn(),
  buildRAGConfigFromSettings: jest.fn(),
}));

jest.mock('@/lib/skills/executor', () => ({
  createSkillTools: jest.fn(() => ({})),
}));

// Import after mocks
import { useUnifiedTools } from './use-unified-tools';

describe('useUnifiedTools', () => {
  describe('initialization', () => {
    it('should return tools object', () => {
      const { result } = renderHook(() => useUnifiedTools());
      
      expect(result.current).toHaveProperty('tools');
      expect(typeof result.current.tools).toBe('object');
    });

    it('should return registry', () => {
      const { result } = renderHook(() => useUnifiedTools());
      
      expect(result.current).toHaveProperty('registry');
    });

    it('should return getToolsByCategory function', () => {
      const { result } = renderHook(() => useUnifiedTools());
      
      expect(typeof result.current.getToolsByCategory).toBe('function');
    });

    it('should return filter function', () => {
      const { result } = renderHook(() => useUnifiedTools());
      
      expect(typeof result.current.filter).toBe('function');
    });

    it('should return searchTools function', () => {
      const { result } = renderHook(() => useUnifiedTools());
      
      expect(typeof result.current.searchTools).toBe('function');
    });
  });

  describe('getToolsByCategory', () => {
    it('should return array for category', () => {
      const { result } = renderHook(() => useUnifiedTools());
      
      const tools = result.current.getToolsByCategory('utility' as never);
      expect(Array.isArray(tools)).toBe(true);
    });
  });

  describe('getToolsBySource', () => {
    it('should return array for source', () => {
      const { result } = renderHook(() => useUnifiedTools());
      
      const tools = result.current.getToolsBySource('builtin' as never);
      expect(Array.isArray(tools)).toBe(true);
    });
  });

  describe('searchTools', () => {
    it('should return array for search query', () => {
      const { result } = renderHook(() => useUnifiedTools());
      
      const tools = result.current.searchTools('test');
      expect(Array.isArray(tools)).toBe(true);
    });
  });

  describe('tool management', () => {
    it('should have enableTool function', () => {
      const { result } = renderHook(() => useUnifiedTools());
      
      expect(typeof result.current.enableTool).toBe('function');
    });

    it('should have disableTool function', () => {
      const { result } = renderHook(() => useUnifiedTools());
      
      expect(typeof result.current.disableTool).toBe('function');
    });

    it('should have toggleTool function', () => {
      const { result } = renderHook(() => useUnifiedTools());
      
      expect(typeof result.current.toggleTool).toBe('function');
    });
  });

  describe('sync functions', () => {
    it('should have syncAll function', () => {
      const { result } = renderHook(() => useUnifiedTools());
      
      expect(typeof result.current.syncAll).toBe('function');
    });
  });
});
