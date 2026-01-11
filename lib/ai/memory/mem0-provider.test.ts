/**
 * Tests for Mem0 Provider
 */

import { Mem0Provider } from './mem0-provider';
import { mem0ToLocalMemory, localToMem0Memory } from '@/types/provider/memory-provider';
import type { Memory, Mem0Memory } from '@/types';

// Mock fetch
global.fetch = jest.fn();

describe('Mem0Provider', () => {
  const mockConfig = {
    apiKey: 'm0-test-key',
    userId: 'test-user',
    enableGraph: false,
  };

  let provider: Mem0Provider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new Mem0Provider(mockConfig);
  });

  describe('initialization', () => {
    it('should create provider with config', () => {
      expect(provider.type).toBe('mem0');
    });

    it('should create provider with MCP config', () => {
      const mcpConfig = {
        ...mockConfig,
        useMcp: true,
        mcpServerId: 'mem0-server',
      };
      const mcpProvider = new Mem0Provider(mcpConfig, jest.fn());
      expect(mcpProvider.type).toBe('mem0');
    });
  });

  describe('addMemory via API', () => {
    it('should add memory successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          results: [{ id: 'mem-123', memory: 'Test content', event: 'ADD' }],
        }),
      });

      const memory = await provider.addMemory({
        type: 'preference',
        content: 'I prefer dark mode',
      });

      expect(memory.id).toBe('mem-123');
      expect(memory.content).toBe('Test content');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/memories/'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Token m0-test-key',
          }),
        })
      );
    });

    it('should throw error on API failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(provider.addMemory({
        type: 'preference',
        content: 'Test',
      })).rejects.toThrow('Mem0 API error');
    });

    it('should throw error when no memory returned', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      await expect(provider.addMemory({
        type: 'preference',
        content: 'Test',
      })).rejects.toThrow('No memory returned');
    });
  });

  describe('getMemory', () => {
    it('should get memory by ID', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'mem-123',
          memory: 'Test content',
          created_at: '2024-01-01T00:00:00Z',
        }),
      });

      const memory = await provider.getMemory('mem-123');

      expect(memory).not.toBeNull();
      expect(memory?.id).toBe('mem-123');
    });

    it('should return null for non-existent memory', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found'),
      });

      const memory = await provider.getMemory('non-existent');
      expect(memory).toBeNull();
    });
  });

  describe('getMemories', () => {
    it('should get all memories', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          results: [
            { id: '1', memory: 'Memory 1' },
            { id: '2', memory: 'Memory 2' },
          ],
        }),
      });

      const memories = await provider.getMemories();

      expect(memories).toHaveLength(2);
    });

    it('should filter by type', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          results: [
            { id: '1', memory: 'Pref 1', metadata: { type: 'preference' } },
            { id: '2', memory: 'Fact 1', metadata: { type: 'fact' } },
          ],
        }),
      });

      const memories = await provider.getMemories({ type: 'preference' });

      expect(memories).toHaveLength(1);
      expect(memories[0].type).toBe('preference');
    });
  });

  describe('searchMemories', () => {
    it('should search memories', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          results: [
            { id: '1', memory: 'I prefer dark mode', score: 0.95 },
          ],
        }),
      });

      const results = await provider.searchMemories('dark mode');

      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(0.95);
      expect(results[0].matchType).toBe('semantic');
    });

    it('should respect limit option', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      await provider.searchMemories('test', { limit: 5 });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"limit":5'),
        })
      );
    });
  });

  describe('updateMemory', () => {
    it('should update memory', async () => {
      // Mock update call
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
        // Mock getMemory call
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'mem-123',
            memory: 'Updated content',
          }),
        });

      const updated = await provider.updateMemory('mem-123', {
        content: 'Updated content',
      });

      expect(updated).not.toBeNull();
    });
  });

  describe('deleteMemory', () => {
    it('should delete memory', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const deleted = await provider.deleteMemory('mem-123');

      expect(deleted).toBe(true);
    });

    it('should return false on failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const deleted = await provider.deleteMemory('mem-123');

      expect(deleted).toBe(false);
    });
  });

  describe('deleteAllMemories', () => {
    it('should delete all memories', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const count = await provider.deleteAllMemories();

      expect(count).toBe(-1); // Returns -1 since exact count unknown
    });
  });

  describe('batchAdd', () => {
    it('should add multiple memories', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            results: [{ id: '1', memory: 'Memory 1', event: 'ADD' }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            results: [{ id: '2', memory: 'Memory 2', event: 'ADD' }],
          }),
        });

      const memories = await provider.batchAdd([
        { type: 'preference', content: 'Memory 1' },
        { type: 'fact', content: 'Memory 2' },
      ]);

      expect(memories).toHaveLength(2);
    });

    it('should handle partial failures', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            results: [{ id: '1', memory: 'Memory 1', event: 'ADD' }],
          }),
        })
        .mockRejectedValueOnce(new Error('Failed'));

      const memories = await provider.batchAdd([
        { type: 'preference', content: 'Memory 1' },
        { type: 'fact', content: 'Memory 2' },
      ]);

      expect(memories).toHaveLength(1);
    });
  });

  describe('batchDelete', () => {
    it('should delete multiple memories', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      const deleted = await provider.batchDelete(['1', '2']);

      expect(deleted).toBe(2);
    });
  });

  describe('listEntities', () => {
    it('should return empty array when graph disabled', async () => {
      const entities = await provider.listEntities();
      expect(entities).toEqual([]);
    });

    it('should list entities when graph enabled', async () => {
      const graphProvider = new Mem0Provider({ ...mockConfig, enableGraph: true });
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          results: [
            { name: 'Entity1', entity_type: 'person' },
          ],
        }),
      });

      const entities = await graphProvider.listEntities();
      expect(entities).toHaveLength(1);
    });
  });

  describe('sync', () => {
    it('should sync and update lastSyncTime', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      await provider.sync();

      expect(provider.getLastSyncTime()).not.toBeNull();
    });
  });
});

describe('Type Conversion Functions', () => {
  describe('mem0ToLocalMemory', () => {
    it('should convert mem0 memory to local format', () => {
      const mem0Memory: Mem0Memory = {
        id: 'mem-123',
        memory: 'Test content',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        metadata: { type: 'preference' },
        categories: ['work'],
        immutable: true,
      };

      const local = mem0ToLocalMemory(mem0Memory);

      expect(local.id).toBe('mem-123');
      expect(local.content).toBe('Test content');
      expect(local.type).toBe('preference');
      expect(local.pinned).toBe(true);
      expect(local.tags).toContain('work');
    });

    it('should use default type when not specified', () => {
      const mem0Memory: Mem0Memory = {
        id: 'mem-123',
        memory: 'Test content',
      };

      const local = mem0ToLocalMemory(mem0Memory);

      expect(local.type).toBe('fact');
    });

    it('should handle missing dates', () => {
      const mem0Memory: Mem0Memory = {
        id: 'mem-123',
        memory: 'Test content',
      };

      const local = mem0ToLocalMemory(mem0Memory);

      expect(local.createdAt).toBeInstanceOf(Date);
      expect(local.lastUsedAt).toBeInstanceOf(Date);
    });
  });

  describe('localToMem0Memory', () => {
    it('should convert local memory to mem0 format', () => {
      const localMemory: Memory = {
        id: 'local-123',
        type: 'preference',
        content: 'I prefer dark mode',
        source: 'explicit',
        category: 'settings',
        tags: ['ui', 'theme'],
        createdAt: new Date(),
        lastUsedAt: new Date(),
        useCount: 5,
        enabled: true,
        pinned: true,
        priority: 8,
        scope: 'global',
      };

      const mem0 = localToMem0Memory(localMemory, 'test-user');

      expect(mem0.memory).toBe('I prefer dark mode');
      expect(mem0.user_id).toBe('test-user');
      expect(mem0.metadata?.type).toBe('preference');
      expect(mem0.metadata?.priority).toBe(8);
      expect(mem0.immutable).toBe(true);
      expect(mem0.categories).toContain('ui');
    });
  });
});
