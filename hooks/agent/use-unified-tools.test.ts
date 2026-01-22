/**
 * Tests for useUnifiedTools hook
 */

import { renderHook } from '@testing-library/react';

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      ragEnabled: false,
      providerSettings: {
        tavily: { apiKey: '' },
        firecrawl: { apiKey: '' },
        openai: { apiKey: '' },
      },
      vectorSettings: {
        embeddingProvider: 'openai',
        embeddingModel: 'text-embedding-3-small',
      },
    };
    return typeof selector === 'function' ? selector(state) : state;
  },
  useSkillStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      skills: {},
      activeSkillIds: [],
    };
    return typeof selector === 'function' ? selector(state) : state;
  },
  useMcpStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      servers: [],
      isInitialized: true,
    };
    return typeof selector === 'function' ? selector(state) : state;
  },
  useVectorStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      collections: [],
      settings: {
        embeddingProvider: 'openai',
        embeddingModel: 'text-embedding-3-small',
      },
    };
    return typeof selector === 'function' ? selector(state) : state;
  },
  useProjectStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      projects: [],
      activeProjectId: null,
      getActiveProject: () => null,
    };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

// Mock AI tools
const mockRegistry = {
  getAll: jest.fn(() => []),
  filter: jest.fn(() => []),
  getBySource: jest.fn(() => []),
  getByCategory: jest.fn(() => []),
  getToolsRecord: jest.fn(() => ({})),
  search: jest.fn(() => []),
  getStats: jest.fn(() => ({ total: 0, enabled: 0, disabled: 0, bySource: {}, byCategory: {} })),
  enable: jest.fn(),
  disable: jest.fn(),
  toggle: jest.fn(),
  clear: jest.fn(),
  register: jest.fn(),
  subscribe: jest.fn(() => jest.fn()),
  unsubscribe: jest.fn(),
  unregisterBySource: jest.fn(),
  registerBatch: jest.fn(),
  get: jest.fn(),
  has: jest.fn(() => false),
  unregister: jest.fn(),
  setEnabled: jest.fn(),
  isEnabled: jest.fn(() => true),
};

jest.mock('@/lib/ai/tools', () => ({
  UnifiedToolRegistry: jest.fn().mockImplementation(() => mockRegistry),
  getUnifiedToolRegistry: jest.fn(() => mockRegistry),
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
