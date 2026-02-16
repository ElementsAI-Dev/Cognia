/**
 * Tests for Memory Tools
 */

// Jest globals are auto-imported
const vi = { fn: jest.fn, spyOn: jest.spyOn, mock: jest.mock, clearAllMocks: jest.clearAllMocks };
import {
  memoryTools,
  memoryStoreTool,
  memoryRecallTool,
  memoryDeleteTool,
  memoryListTool,
  memoryUpdateTool,
  executeMemoryStore,
  executeMemoryRecall,
  executeMemorySearch,
  executeMemoryDelete,
  executeMemoryList,
  executeMemoryUpdate,
} from './memory-tool';

// Mock the memory manager
vi.mock('../agent/memory-manager', () => ({
  globalMemoryManager: {
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
    query: vi.fn(() => []),
    getStats: vi.fn(() => ({
      totalEntries: 5,
      totalAccessCount: 10,
      tags: { 'agent-context': 3, 'user-pref': 2 },
    })),
  },
}));

describe('Memory Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('memoryTools', () => {
    it('should return all memory tools', () => {
      expect(memoryTools).toHaveLength(6);
      
      const toolNames = memoryTools.map(t => t.name);
      expect(toolNames).toContain('memory_store');
      expect(toolNames).toContain('memory_recall');
      expect(toolNames).toContain('memory_search');
      expect(toolNames).toContain('memory_forget');
      expect(toolNames).toContain('memory_list');
      expect(toolNames).toContain('memory_update');
    });

    it('should have memory category for all tools', () => {
      for (const tool of memoryTools) {
        expect(tool.category).toBe('memory');
      }
    });
  });

  describe('memoryStoreTool', () => {
    it('should have correct metadata', () => {
      expect(memoryStoreTool.name).toBe('memory_store');
      expect(memoryStoreTool.description).toContain('Store information');
      expect(memoryStoreTool.requiresApproval).toBe(false);
      expect(memoryStoreTool.category).toBe('memory');
    });
  });

  describe('executeMemoryStore', () => {
    it('should store a memory', async () => {
      const result = await executeMemoryStore({
        key: 'user_name',
        value: 'John',
        tags: ['user-pref'],
      });

      expect(result).toMatchObject({
        success: true,
        key: 'user_name',
      });
    });
  });

  describe('executeMemoryRecall', () => {
    it('should return error for non-existent memory', async () => {
      const result = await executeMemoryRecall({ key: 'missing_key' });

      expect(result).toMatchObject({
        success: false,
        message: expect.stringContaining('No memory found'),
      });
    });
  });

  describe('executeMemorySearch', () => {
    it('should search memories', async () => {
      const result = await executeMemorySearch({
        tags: ['agent-context'],
        limit: 5,
      });

      expect(result).toMatchObject({
        success: true,
        memories: expect.any(Array),
      });
    });
  });

  describe('executeMemoryDelete', () => {
    it('should return error for non-existent memory', async () => {
      const result = await executeMemoryDelete({ key: 'missing_key' });

      expect(result).toMatchObject({
        success: false,
        message: expect.stringContaining('No memory found'),
      });
    });
  });

  describe('executeMemoryList', () => {
    it('should list memories with stats', async () => {
      const result = await executeMemoryList({ limit: 20 });

      expect(result).toMatchObject({
        success: true,
        memories: expect.any(Array),
        stats: expect.objectContaining({
          totalEntries: expect.any(Number),
        }),
      });
    });
  });

  describe('executeMemoryUpdate', () => {
    it('should return error for non-existent memory', async () => {
      const result = await executeMemoryUpdate({
        key: 'missing_key',
        value: 'new value',
      });

      expect(result).toMatchObject({
        success: false,
        message: expect.stringContaining('No memory found'),
      });
    });
  });

  describe('tool requirements', () => {
    it('memoryRecallTool should not require approval', () => {
      expect(memoryRecallTool.requiresApproval).toBe(false);
    });

    it('memoryDeleteTool should not require approval', () => {
      expect(memoryDeleteTool.requiresApproval).toBe(false);
    });

    it('memoryListTool should not require approval', () => {
      expect(memoryListTool.requiresApproval).toBe(false);
    });

    it('memoryUpdateTool should not require approval', () => {
      expect(memoryUpdateTool.requiresApproval).toBe(false);
    });
  });
});
