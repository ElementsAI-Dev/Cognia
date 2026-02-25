/**
 * Tests for Context File Repository
 */

import 'fake-indexeddb/auto';
import { db } from '../schema';
import { contextFileRepository, type CreateContextFileInput } from './context-file-repository';

function makeContextFileInput(overrides?: Partial<CreateContextFileInput>): CreateContextFileInput {
  return {
    path: '/context/tool-output/result.json',
    category: 'tool-output',
    source: 'mcp-tool',
    filename: 'result.json',
    content: '{"key": "value"}',
    sizeBytes: 16,
    estimatedTokens: 8,
    tags: ['json', 'tool'],
    ...overrides,
  };
}

describe('contextFileRepository', () => {
  beforeEach(async () => {
    await db.contextFiles.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  describe('create', () => {
    it('creates a context file with all fields', async () => {
      const result = await contextFileRepository.create(makeContextFileInput());

      expect(result.id).toBeDefined();
      expect(result.path).toBe('/context/tool-output/result.json');
      expect(result.category).toBe('tool-output');
      expect(result.source).toBe('mcp-tool');
      expect(result.filename).toBe('result.json');
      expect(result.content).toBe('{"key": "value"}');
      expect(result.sizeBytes).toBe(16);
      expect(result.estimatedTokens).toBe(8);
      expect(result.tags).toEqual(['json', 'tool']);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.lastAccessedAt).toBeInstanceOf(Date);
    });

    it('creates a context file with defaults for optional fields', async () => {
      const result = await contextFileRepository.create({
        path: '/context/history/chat.txt',
        category: 'history',
        source: 'chat',
        content: 'Hello world',
        sizeBytes: 11,
        estimatedTokens: 3,
      });

      expect(result.tags).toEqual([]);
      expect(result.ttlMs).toBeUndefined();
      expect(result.filename).toBeUndefined();
    });

    it('creates a context file with TTL', async () => {
      const result = await contextFileRepository.create(
        makeContextFileInput({ ttlMs: 3600000 })
      );

      expect(result.ttlMs).toBe(3600000);
    });
  });

  describe('getById', () => {
    it('returns context file when found', async () => {
      const created = await contextFileRepository.create(makeContextFileInput());

      const found = await contextFileRepository.getById(created.id);
      expect(found).toBeDefined();
      expect(found?.path).toBe('/context/tool-output/result.json');
    });

    it('returns undefined when not found', async () => {
      const found = await contextFileRepository.getById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getByPath', () => {
    it('returns context file by path', async () => {
      await contextFileRepository.create(makeContextFileInput());

      const found = await contextFileRepository.getByPath('/context/tool-output/result.json');
      expect(found).toBeDefined();
      expect(found?.category).toBe('tool-output');
    });

    it('returns undefined for unknown path', async () => {
      const found = await contextFileRepository.getByPath('/nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('getByCategory', () => {
    it('returns files for a category', async () => {
      await contextFileRepository.create(makeContextFileInput({ category: 'tool-output' }));
      await contextFileRepository.create(
        makeContextFileInput({ path: '/ctx/tool2', category: 'tool-output' })
      );
      await contextFileRepository.create(
        makeContextFileInput({ path: '/ctx/hist', category: 'history' })
      );

      const results = await contextFileRepository.getByCategory('tool-output');
      expect(results).toHaveLength(2);
    });

    it('returns empty array for unknown category', async () => {
      const results = await contextFileRepository.getByCategory('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('getByCategoryAndSource', () => {
    it('returns files matching category and source', async () => {
      await contextFileRepository.create(
        makeContextFileInput({ path: '/a', category: 'tool-output', source: 'mcp-tool' })
      );
      await contextFileRepository.create(
        makeContextFileInput({ path: '/b', category: 'tool-output', source: 'other' })
      );
      await contextFileRepository.create(
        makeContextFileInput({ path: '/c', category: 'history', source: 'mcp-tool' })
      );

      const results = await contextFileRepository.getByCategoryAndSource('tool-output', 'mcp-tool');
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('/a');
    });
  });

  describe('upsert', () => {
    it('updates an existing context file', async () => {
      const created = await contextFileRepository.create(makeContextFileInput());
      const updated = { ...created, content: 'Updated content', sizeBytes: 15 };

      await contextFileRepository.upsert(updated);

      const found = await contextFileRepository.getById(created.id);
      expect(found?.content).toBe('Updated content');
      expect(found?.sizeBytes).toBe(15);
    });
  });

  describe('touch', () => {
    it('updates lastAccessedAt timestamp', async () => {
      const created = await contextFileRepository.create(makeContextFileInput());
      const originalAccessMs = new Date(created.lastAccessedAt).getTime();

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));
      await contextFileRepository.touch(created.id);

      const found = await contextFileRepository.getById(created.id);
      const updatedAccessMs = new Date(found!.lastAccessedAt).getTime();
      expect(updatedAccessMs).toBeGreaterThanOrEqual(originalAccessMs);
    });
  });

  describe('delete', () => {
    it('deletes a context file by id', async () => {
      const created = await contextFileRepository.create(makeContextFileInput());

      await contextFileRepository.delete(created.id);

      const found = await contextFileRepository.getById(created.id);
      expect(found).toBeUndefined();
    });
  });

  describe('deleteByCategory', () => {
    it('deletes all files in a category', async () => {
      await contextFileRepository.create(
        makeContextFileInput({ path: '/a', category: 'temp' })
      );
      await contextFileRepository.create(
        makeContextFileInput({ path: '/b', category: 'temp' })
      );
      await contextFileRepository.create(
        makeContextFileInput({ path: '/c', category: 'history' })
      );

      const deleted = await contextFileRepository.deleteByCategory('temp');
      expect(deleted).toBe(2);

      const remaining = await contextFileRepository.count();
      expect(remaining).toBe(1);
    });

    it('returns 0 when no files to delete', async () => {
      const deleted = await contextFileRepository.deleteByCategory('nonexistent');
      expect(deleted).toBe(0);
    });
  });

  describe('cleanupExpired', () => {
    it('removes files past their TTL', async () => {
      // Create a file with expired TTL (created 2 hours ago, TTL 1 hour)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const expiredRow = {
        id: 'expired-1',
        path: '/expired',
        category: 'temp',
        source: 'test',
        content: 'old',
        sizeBytes: 3,
        estimatedTokens: 1,
        tags: [],
        ttlMs: 60 * 60 * 1000, // 1 hour
        createdAt: twoHoursAgo,
        lastAccessedAt: twoHoursAgo,
      };
      await db.contextFiles.add(expiredRow);

      // Create a file with valid TTL
      await contextFileRepository.create(
        makeContextFileInput({ path: '/valid', ttlMs: 24 * 60 * 60 * 1000 })
      );

      // Create a file without TTL (should not be cleaned)
      await contextFileRepository.create(
        makeContextFileInput({ path: '/no-ttl' })
      );

      const cleaned = await contextFileRepository.cleanupExpired();
      expect(cleaned).toBe(1);

      const remaining = await contextFileRepository.count();
      expect(remaining).toBe(2);
    });

    it('returns 0 when nothing expired', async () => {
      await contextFileRepository.create(makeContextFileInput());

      const cleaned = await contextFileRepository.cleanupExpired();
      expect(cleaned).toBe(0);
    });
  });

  describe('count', () => {
    it('returns the total count', async () => {
      await contextFileRepository.create(makeContextFileInput({ path: '/a' }));
      await contextFileRepository.create(makeContextFileInput({ path: '/b' }));

      const count = await contextFileRepository.count();
      expect(count).toBe(2);
    });
  });

  describe('clear', () => {
    it('removes all context files', async () => {
      await contextFileRepository.create(makeContextFileInput({ path: '/a' }));
      await contextFileRepository.create(makeContextFileInput({ path: '/b' }));

      await contextFileRepository.clear();

      const count = await contextFileRepository.count();
      expect(count).toBe(0);
    });
  });
});
